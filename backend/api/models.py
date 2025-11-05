from django.db import models, transaction
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver

class Farmer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return self.user.username

class Vehicle(models.Model):
    VEHICLE_TYPES = (
        ('Truck', 'Truck'),
        ('Tractor', 'Tractor'),
        ('Pickup', 'Pickup'),
        ('Other', 'Other'),
    )

    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    vehicle_type = models.CharField(max_length=50, choices=VEHICLE_TYPES)
    capacity = models.FloatField(help_text='Capacity in kg')
    route = models.CharField(max_length=150, blank=True, null=True)
    available = models.BooleanField(default=True)
    license_plate = models.CharField(max_length=50, blank=True, null=True)
    display_name = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        if self.display_name:
            return f"{self.display_name} ({self.vehicle_type})"
        return f"{self.vehicle_type} - {int(self.capacity)}kg"

class TransportRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE)
    produce_type = models.CharField(max_length=100)
    quantity = models.FloatField()
    destination = models.CharField(max_length=150)
    date = models.DateField()
    matched_vehicle = models.ForeignKey(Vehicle, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        return f"{self.produce_type} to {self.destination} ({self.status})"


# -----------------------------
# AgriPool 2.0: Pool Offers flow
# -----------------------------

# Status constants reused across pool/join
STATUS_PENDING = "PENDING"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"

STATUS_FULL = "FULL"

POOL_STATUS_CHOICES = [
    (STATUS_PENDING, 'Pending'),
    (STATUS_APPROVED, 'Approved'),
    (STATUS_REJECTED, 'Rejected'),
    (STATUS_FULL, 'Full'),
]


class TransportPool(models.Model):
    """
    A pool offer created by a provider farmer (who may have a vehicle).
    Other farmers can request to join via PoolJoinRequest.
    """
    provider = models.ForeignKey('api.Farmer', on_delete=models.CASCADE, related_name='provided_pools')
    vehicle = models.ForeignKey('api.Vehicle', null=True, blank=True, on_delete=models.SET_NULL, related_name='pools')
    # New: allow simple, ownership-free vehicle selection via type string
    vehicle_type = models.CharField(max_length=50, null=True, blank=True, help_text='Selected vehicle type when no concrete Vehicle is assigned')
    origin = models.CharField(max_length=150)
    destination = models.CharField(max_length=150)
    date = models.DateField()
    distance_km = models.FloatField(null=True, blank=True, help_text='Optional distance in kilometers')
    total_capacity = models.FloatField(help_text='Total capacity of this pool in kg')
    provider_load = models.FloatField(default=0.0, help_text='Provider load in kg included in this pool')
    available_capacity = models.FloatField(help_text='Remaining available capacity in kg')
    # Backwards compatibility with legacy code/tests (deprecated)
    price_per_km = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    rate_per_kg_per_km = models.FloatField(default=1.0, help_text='[Deprecated] Rate per kg per km')
    price_per_kg = models.FloatField(default=0.0, help_text='[Deprecated] Computed price per kg for route')
    # New per-km pricing model
    rate_per_km = models.FloatField(default=0.0, help_text='Vehicle rate per km based on vehicle type')
    total_cost = models.FloatField(default=0.0, help_text='Total trip cost = distance_km * rate_per_km')
    provider_share = models.FloatField(default=0.0, help_text='Provider cost share based on provider_load ratio')
    status = models.CharField(max_length=10, choices=POOL_STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Completion state
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Pool {self.pk}: {self.origin} → {self.destination} on {self.date}"

    def save(self, *args, **kwargs):
        # On creation, ensure available_capacity is at least total_capacity if not provided
        if self.pk is None:
            if self.available_capacity is None or self.available_capacity == 0:
                self.available_capacity = self.total_capacity

        # Determine per-km rate from vehicle or vehicle_type (final plan rates)
        # Final plan mapping:
        #  Mini Truck: 10, Tempo: 15, Truck: 25, Tractor: 30, Container: 40
        # Keep some legacy fallbacks for compatibility.
        plan_rates = {
            'Mini Truck': 10.0,
            'Tempo': 15.0,
            'Truck': 25.0,
            'Tractor': 30.0,
            'Container': 40.0,
        }
        legacy_rates = {
            'Pickup': 20.0,
            'LCV': 30.0,
            'Light Commercial Vehicle': 30.0,
            'Medium Truck': 25.0,
            '10-Wheeler': 35.0,
            'Multi-Axle': 50.0,
            'Other': 20.0,
        }
        vtype = None
        if self.vehicle:
            vtype = self.vehicle.vehicle_type
        elif self.vehicle_type:
            vtype = self.vehicle_type

        if vtype:
            self.rate_per_km = plan_rates.get(vtype, legacy_rates.get(vtype, 20.0))

        # Compute totals
        dist = float(self.distance_km or 0.0)
        self.total_cost = round(dist * float(self.rate_per_km or 0.0), 2)

        total_cap = float(self.total_capacity or 0.0)
        prov_load = float(self.provider_load or 0.0)
        ratio = (prov_load / total_cap) if total_cap > 0 else 0.0
        self.provider_share = round(self.total_cost * ratio, 2)

        # Compute available capacity unless this save explicitly updates it (e.g., join approvals).
        update_fields = kwargs.get("update_fields") if isinstance(kwargs, dict) else None
        explicit_capacity_update = bool(update_fields and ("available_capacity" in update_fields))
        if self.pk is None or not explicit_capacity_update:
            self.available_capacity = max(total_cap - prov_load, 0.0)
        if self.available_capacity <= 0:
            self.status = STATUS_FULL

        super().save(*args, **kwargs)

    def can_accept(self, quantity: float) -> bool:
        try:
            q = float(quantity)
        except Exception:
            q = 0.0
        return (self.available_capacity >= q)


class PoolJoinRequest(models.Model):
    """
    A request by a farmer to join a TransportPool.
    Admin or provider can approve/reject.
    """
    pool = models.ForeignKey(TransportPool, on_delete=models.CASCADE, related_name='join_requests')
    requester = models.ForeignKey('api.Farmer', on_delete=models.CASCADE, related_name='join_requests')
    produce_type = models.CharField(max_length=100)
    quantity = models.FloatField()
    destination = models.CharField(max_length=150)
    date_created = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=10, choices=POOL_STATUS_CHOICES, default=STATUS_PENDING)
    accepted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_created']

    def __str__(self):
        return f"JoinRequest {self.pk} for Pool {self.pool.pk} by {self.requester.user.username}"

    def approve(self):
        """
        Atomically approve the join request and decrement pool.available_capacity.
        Raises ValueError if not possible.
        """
        if self.status != STATUS_PENDING:
            raise ValueError("Only pending requests can be approved")

        with transaction.atomic():
            pool = TransportPool.objects.select_for_update().get(pk=self.pool.pk)
            if pool.available_capacity < self.quantity:
                raise ValueError("Insufficient capacity in pool")
            pool.available_capacity = pool.available_capacity - self.quantity
            if pool.available_capacity <= 0:
                pool.available_capacity = 0
                pool.status = STATUS_FULL
            pool.save(update_fields=['available_capacity', 'status', 'updated_at'])

            self.status = STATUS_APPROVED
            self.accepted_at = timezone.now()
            self.save(update_fields=['status', 'accepted_at'])

    def reject(self):
        if self.status != STATUS_PENDING:
            raise ValueError("Only pending requests can be rejected")
        self.status = STATUS_REJECTED
        self.save(update_fields=['status'])


# -----------------------------
# Notifications
# -----------------------------
class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    link = models.URLField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification to {self.user.username}: {self.message[:40]}"


# -----------------------------
# Farmer Profile (Phase 4)
# -----------------------------
class FarmerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmerprofile')
    location = models.CharField(max_length=120, blank=True)
    contact = models.CharField(max_length=20, blank=True)
    farm_size = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    preferred_crops = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


@receiver(post_save, sender=User)
def create_profile_for_user(sender, instance, created, **kwargs):
    if created:
        try:
            FarmerProfile.objects.create(user=instance)
        except Exception:
            pass
