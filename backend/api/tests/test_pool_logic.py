from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import Farmer, Vehicle, TransportPool, PoolJoinRequest


class PoolJoinTests(TestCase):
    def setUp(self):
        self.user_provider = User.objects.create_user(username='provider', password='pass')
        self.user_requester = User.objects.create_user(username='requester', password='pass')
        self.farmer_provider = Farmer.objects.create(user=self.user_provider, phone='111', location='A')
        self.farmer_requester = Farmer.objects.create(user=self.user_requester, phone='222', location='B')
        self.vehicle = Vehicle.objects.create(owner=self.user_provider, vehicle_type='Truck', capacity=2000, route='A-B', available=True)
        self.pool = TransportPool.objects.create(
            provider=self.farmer_provider,
            vehicle=self.vehicle,
            origin='A',
            destination='B',
            date=timezone.now().date(),
            total_capacity=1000,
            available_capacity=1000,
            price_per_km=10,
            status='APPROVED'
        )

    def test_join_and_approve_decrements_capacity(self):
        jr = PoolJoinRequest.objects.create(
            pool=self.pool,
            requester=self.farmer_requester,
            produce_type='Wheat',
            quantity=200,
            destination='B'
        )
        jr.approve()
        self.pool.refresh_from_db()
        self.assertEqual(jr.status, 'APPROVED')
        self.assertEqual(float(self.pool.available_capacity), 800.0)

    def test_approve_fails_if_insufficient_capacity(self):
        jr = PoolJoinRequest.objects.create(
            pool=self.pool,
            requester=self.farmer_requester,
            produce_type='Rice',
            quantity=1200,
            destination='B'
        )
        with self.assertRaises(ValueError):
            jr.approve()
