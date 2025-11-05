from django.db import migrations

def forwards(apps, schema_editor):
    TransportRequest = apps.get_model('api', 'TransportRequest')
    TransportPool = apps.get_model('api', 'TransportPool')
    count = 0
    for tr in TransportRequest.objects.all():
        provider = getattr(tr, 'farmer', None)
        if provider is None:
            continue
        TransportPool.objects.create(
            provider=provider,
            vehicle=getattr(tr, 'matched_vehicle', None),
            origin='Unknown',
            destination=getattr(tr, 'destination', 'Unknown'),
            date=getattr(tr, 'date', None),
            total_capacity=getattr(tr, 'quantity', 0),
            available_capacity=getattr(tr, 'quantity', 0),
            price_per_km=0,
            status=(getattr(tr, 'status', 'PENDING') or 'PENDING').upper(),
            notes=f'Imported from TransportRequest id={tr.id}',
        )
        count += 1
    print(f'[AgriPool] Imported {count} TransportRequest rows into TransportPool')

def backwards(apps, schema_editor):
    TransportPool = apps.get_model('api', 'TransportPool')
    TransportPool.objects.filter(notes__contains='Imported from TransportRequest').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0003_transportpool_pooljoinrequest'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
