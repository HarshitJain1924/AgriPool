from django.contrib import admin
from .models import Farmer, Vehicle, TransportRequest, TransportPool, PoolJoinRequest, Notification

admin.site.register(Farmer)
admin.site.register(Vehicle)
admin.site.register(TransportRequest)


@admin.register(TransportPool)
class TransportPoolAdmin(admin.ModelAdmin):
	list_display = (
		'id', 'provider', 'origin', 'destination', 'date',
		'total_capacity', 'available_capacity', 'status'
	)
	list_filter = ('status', 'origin', 'destination', 'date')
	search_fields = ('provider__user__username', 'origin', 'destination')


@admin.register(PoolJoinRequest)
class PoolJoinRequestAdmin(admin.ModelAdmin):
	list_display = (
		'id', 'pool', 'requester', 'produce_type', 'quantity', 'status', 'date_created'
	)
	list_filter = ('status', 'date_created')
	search_fields = ('requester__user__username', 'produce_type')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'message', 'is_read', 'created_at')
	list_filter = ('is_read', 'created_at')
	search_fields = ('user__username', 'message')
