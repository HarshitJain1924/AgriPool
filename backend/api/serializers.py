from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Farmer, Vehicle, TransportRequest, TransportPool, PoolJoinRequest, Notification, FarmerProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class FarmerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Farmer
        fields = '__all__'


# Simple user serializer for embedding in vehicle payloads
class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class VehicleSerializer(serializers.ModelSerializer):
    owner = SimpleUserSerializer(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    vehicle_display = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = (
            'id', 'owner', 'owner_username', 'vehicle_type', 'capacity',
            'route', 'available', 'license_plate', 'display_name', 'vehicle_display'
        )

    def get_vehicle_display(self, obj):
        label = obj.display_name or f"{obj.vehicle_type} ({int(obj.capacity)}kg)"
        if obj.license_plate:
            label += f" - {obj.license_plate}"
        return label


class TransportRequestSerializer(serializers.ModelSerializer):
    farmer = FarmerSerializer(read_only=True)
    farmer_name = serializers.SerializerMethodField()

    class Meta:
        model = TransportRequest
        fields = '__all__'

    def get_farmer_name(self, obj):
        try:
            return obj.farmer.user.username
        except Exception:
            return ''


# -----------------------------
# AgriPool 2.0 serializers
# -----------------------------

class TransportPoolSerializer(serializers.ModelSerializer):
    provider_username = serializers.CharField(source='provider.user.username', read_only=True)
    vehicle_display = serializers.SerializerMethodField(read_only=True)
    available_capacity = serializers.FloatField(read_only=True)
    rate_per_km = serializers.FloatField(read_only=True)
    total_cost = serializers.FloatField(read_only=True)
    provider_share = serializers.FloatField(read_only=True)
    # New: simple vehicle type when no concrete Vehicle is used
    vehicle_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = TransportPool
        fields = (
            'id', 'provider', 'provider_username', 'vehicle', 'vehicle_type', 'vehicle_display',
            'origin', 'destination', 'date', 'distance_km',
            'total_capacity', 'provider_load', 'available_capacity',
            'rate_per_km', 'total_cost', 'provider_share', 'status', 'notes',
            'created_at', 'updated_at', 'is_completed', 'completed_at'
        )
        read_only_fields = (
            'provider', 'available_capacity', 'rate_per_km', 'total_cost', 'provider_share', 'status', 'created_at', 'updated_at', 'is_completed', 'completed_at'
        )

    def get_vehicle_display(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.vehicle_type} - {int(obj.vehicle.capacity)}kg"
        if getattr(obj, 'vehicle_type', None) and getattr(obj, 'total_capacity', None):
            try:
                return f"{obj.vehicle_type} ({int(float(obj.total_capacity))} kg)"
            except Exception:
                return f"{obj.vehicle_type}"
        return None

    def validate(self, attrs):
        # Resolve current values considering updates vs existing instance
        total = attrs.get('total_capacity') if 'total_capacity' in attrs else getattr(self.instance, 'total_capacity', None)
        vehicle = attrs.get('vehicle') if 'vehicle' in attrs else getattr(self.instance, 'vehicle', None)
        provider_load = attrs.get('provider_load') if 'provider_load' in attrs else getattr(self.instance, 'provider_load', 0)
        vehicle_type = attrs.get('vehicle_type') if 'vehicle_type' in attrs else getattr(self.instance, 'vehicle_type', None)

        # total_capacity must be positive
        if total is None or float(total) <= 0:
            raise serializers.ValidationError("total_capacity must be a positive number.")
        # provider_load must be non-negative
        if provider_load is not None and float(provider_load) < 0:
            raise serializers.ValidationError("provider_load cannot be negative.")
        # provider_load cannot exceed total_capacity
        if provider_load is not None and float(provider_load) > float(total):
            raise serializers.ValidationError("Provider load cannot exceed total capacity.")
        # total_capacity should not exceed vehicle capacity when vehicle is provided
        if vehicle is not None and vehicle.capacity is not None and float(total) > float(vehicle.capacity):
            raise serializers.ValidationError("Total capacity cannot exceed the selected vehicle's capacity.")
        # When no concrete vehicle but vehicle_type given, bound by default capacities from the final plan
        if (vehicle is None) and vehicle_type:
            default_caps = {
                'Mini Truck': 1000.0,
                'Tempo': 2000.0,
                'Truck': 5000.0,
                'Tractor': 8000.0,
                'Container': 12000.0,
            }
            max_cap = default_caps.get(vehicle_type)
            if max_cap is not None and float(total) > float(max_cap):
                raise serializers.ValidationError("Total capacity cannot exceed the default capacity for the selected vehicle type.")
        return super().validate(attrs)

    def create(self, validated_data):
        # let model.save compute pricing and shares; nothing special here
        return super().create(validated_data)


class PoolJoinRequestSerializer(serializers.ModelSerializer):
    requester_username = serializers.CharField(source='requester.user.username', read_only=True)
    pool_info = TransportPoolSerializer(source='pool', read_only=True)

    class Meta:
        model = PoolJoinRequest
        fields = (
            'id', 'pool', 'pool_info', 'requester', 'requester_username',
            'produce_type', 'quantity', 'destination', 'status',
            'date_created', 'updated_at', 'accepted_at', 'notes'
        )
        read_only_fields = (
            'status', 'date_created', 'updated_at', 'accepted_at', 'requester', 'requester_username', 'pool_info'
        )

    def validate(self, attrs):
        pool = None
        if self.instance:
            pool = self.instance.pool
        else:
            pool = attrs.get('pool')

        qty = attrs.get('quantity')
        if qty is None or qty <= 0:
            raise serializers.ValidationError("quantity must be a positive number.")

        if pool is None:
            raise serializers.ValidationError("pool is required.")

        if float(pool.available_capacity) < float(qty):
            raise serializers.ValidationError("Not enough available capacity in this pool.")

        return super().validate(attrs)

    def create(self, validated_data):
        # requester will be set in view
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'link', 'is_read', 'created_at')


class FarmerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', required=False)

    class Meta:
        model = FarmerProfile
        fields = (
            'username',
            'location',
            'contact',
            'farm_size',
            'preferred_crops',
        )

    def update(self, instance, validated_data):
        # Allow username update through nested user
        user_data = validated_data.pop('user', {}) if 'user' in validated_data else {}
        username = user_data.get('username')
        if username:
            instance.user.username = username
            instance.user.save(update_fields=['username'])
        return super().update(instance, validated_data)
