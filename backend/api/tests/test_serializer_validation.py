from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import Farmer, Vehicle
from api.serializers import TransportPoolSerializer


class TransportPoolSerializerValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="farmer", password="pass")
        self.farmer = Farmer.objects.create(user=self.user, phone="000", location="X")
        self.vehicle = Vehicle.objects.create(owner=self.user, vehicle_type="Truck", capacity=1000, route="X-Y", available=True)

    def base_payload(self):
        return {
            "vehicle": self.vehicle.id,
            "origin": "X",
            "destination": "Y",
            "date": timezone.now().date(),
            "distance_km": 10,
            "total_capacity": 1000,
            "provider_load": 100,
        }

    def test_provider_load_cannot_exceed_total(self):
        data = self.base_payload()
        data["provider_load"] = 1200
        data["total_capacity"] = 1000
        ser = TransportPoolSerializer(data=data)
        self.assertFalse(ser.is_valid())
        self.assertIn("Provider load cannot exceed total capacity.", str(ser.errors))

    def test_total_cannot_exceed_vehicle_capacity(self):
        data = self.base_payload()
        data["total_capacity"] = 1500
        ser = TransportPoolSerializer(data=data)
        self.assertFalse(ser.is_valid())
        self.assertIn("Total capacity cannot exceed the selected vehicle's capacity.", str(ser.errors))

    def test_valid_payload_passes(self):
        data = self.base_payload()
        ser = TransportPoolSerializer(data=data)
        self.assertTrue(ser.is_valid(), ser.errors)
