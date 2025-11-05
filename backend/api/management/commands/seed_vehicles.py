from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from api.models import Vehicle


class Command(BaseCommand):
    help = "Seed a small set of vehicles so the dropdown shows multiple options."

    def handle(self, *args, **options):
        try:
            existing = Vehicle.objects.count()
            if existing >= 4:
                self.stdout.write(self.style.SUCCESS(f"Vehicles already present: {existing}. Nothing to do."))
                return

            user = User.objects.order_by('id').first()
            if user is None:
                user = User.objects.create_user(username='demo', password='demo')
                self.stdout.write(self.style.WARNING("Created demo user 'demo'/'demo' for vehicle ownership."))

            samples = [
                {"vehicle_type": "Truck", "capacity": 5000, "route": "A-B", "available": True, "display_name": "Truck 5t"},
                {"vehicle_type": "Tractor", "capacity": 2000, "route": "A-C", "available": True, "display_name": "Tractor 2t"},
                {"vehicle_type": "Pickup", "capacity": 1500, "route": "B-C", "available": True, "display_name": "Pickup 1.5t"},
                {"vehicle_type": "Other", "capacity": 1000, "route": "C-D", "available": True, "display_name": "Van 1t"},
            ]

            created = 0
            for s in samples:
                obj, was_created = Vehicle.objects.get_or_create(
                    owner=user,
                    vehicle_type=s["vehicle_type"],
                    capacity=s["capacity"],
                    defaults=s,
                )
                if was_created:
                    created += 1

            self.stdout.write(self.style.SUCCESS(f"Seeded {created} vehicle(s). Total now: {Vehicle.objects.count()}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to seed vehicles: {e}"))
            raise
