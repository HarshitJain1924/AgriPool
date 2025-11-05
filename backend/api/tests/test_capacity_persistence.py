from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import Farmer, Vehicle, TransportPool


class CapacityPersistenceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="farmer", password="pass")
        self.farmer = Farmer.objects.create(user=self.user, phone="999", location="Indore")
        self.vehicle = Vehicle.objects.create(
            owner=self.user,
            vehicle_type="Truck",
            capacity=5000,
            route="Indore-Bhopal",
            available=True,
        )

    def test_capacity_persistence_after_explicit_update(self):
        pool = TransportPool.objects.create(
            provider=self.farmer,
            origin="Indore",
            destination="Bhopal",
            date=timezone.now().date(),
            distance_km=200,
            vehicle=self.vehicle,
            total_capacity=5000,
            provider_load=1000,
        )
        # Initially computed: 4000 available
        self.assertEqual(float(pool.available_capacity), 4000.0)

        # Simulate approval: join 1000 kg (explicit capacity update)
        pool.available_capacity -= 1000
        pool.save(update_fields=["available_capacity"])  # should not be recomputed by save()

        pool.refresh_from_db()
        self.assertEqual(float(pool.available_capacity), 3000.0)  # persisted manual decrement
        # Ensure it's not reset to total_capacity - provider_load (5000 - 1000 = 4000)
        self.assertNotEqual(float(pool.available_capacity), float(pool.total_capacity) - float(pool.provider_load))

    def test_recompute_on_capacity_change(self):
        pool = TransportPool.objects.create(
            provider=self.farmer,
            origin="A",
            destination="B",
            date=timezone.now().date(),
            distance_km=100,
            vehicle=self.vehicle,
            total_capacity=5000,
            provider_load=1000,
        )
        self.assertEqual(float(pool.available_capacity), 4000.0)

        # Change total_capacity without explicit available_capacity update
        pool.total_capacity = 6000
        pool.save()  # no update_fields => model recomputes available_capacity
        pool.refresh_from_db()
        self.assertEqual(float(pool.available_capacity), 5000.0)  # 6000 - 1000
