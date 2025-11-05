from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_migrate_transportrequest_to_pool'),
    ]

    operations = [
        migrations.AddField(
            model_name='transportpool',
            name='vehicle_type',
            field=models.CharField(blank=True, help_text='Selected vehicle type when no concrete Vehicle is assigned', max_length=50, null=True),
        ),
    ]
