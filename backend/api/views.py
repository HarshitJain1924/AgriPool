from rest_framework import viewsets, permissions, status, generics
from .models import Farmer, Vehicle, TransportRequest, TransportPool, PoolJoinRequest, STATUS_APPROVED, STATUS_PENDING, Notification
from .serializers import (
    FarmerSerializer,
    VehicleSerializer,
    TransportRequestSerializer,
    TransportPoolSerializer,
    PoolJoinRequestSerializer,
    NotificationSerializer,
    FarmerProfileSerializer,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

@api_view(['GET'])
def api_overview(request):
    return Response({
        'farmers': '/farmers/',
        'vehicles': '/vehicles/',
        'requests': '/requests/',
        'token': '/token/',
        'signup': '/signup/',
        'user_pools': '/pools/',
        'admin_pools': '/admin/pools/',
    })

class FarmerViewSet(viewsets.ModelViewSet):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer
    permission_classes = [permissions.AllowAny]

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.AllowAny]

class TransportRequestViewSet(viewsets.ModelViewSet):
    queryset = TransportRequest.objects.all()
    serializer_class = TransportRequestSerializer
    permission_classes = [permissions.AllowAny]


# ------------------------
# Auth & Pool endpoints
# ------------------------

# Vehicles list/create (provider sees own vehicles; admin sees all)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vehicles_list_create(request):
    if request.method == 'GET':
        # Simplified: return all vehicles for any authenticated user
        qs = Vehicle.objects.all()
        serializer = VehicleSerializer(qs, many=True)
        return Response(serializer.data)

    # POST
    serializer = VehicleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def signup(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=username, password=password)
    # Create a Farmer profile by default for the user
    Farmer.objects.create(user=user)
    return Response({'message': 'Signup successful'}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_pools(request):
    # Ensure the user has a Farmer profile
    farmer, _ = Farmer.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        serializer = TransportRequestSerializer(data=request.data)
        if serializer.is_valid():
            # Save with the current user's farmer profile
            serializer.save(farmer=farmer, status='PENDING')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # GET: list the current user's pools (transport requests)
    requests_qs = TransportRequest.objects.filter(farmer=farmer).order_by('-id')
    serializer = TransportRequestSerializer(requests_qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_pools(request):
    pools = TransportRequest.objects.all().order_by('-id')
    serializer = TransportRequestSerializer(pools, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAdminUser])
def approve_pool(request, pk):
    try:
        pool = TransportRequest.objects.get(pk=pk)
    except TransportRequest.DoesNotExist:
        return Response({'error': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    

    status_choice = request.data.get('status', 'PENDING')
    if status_choice not in dict(TransportRequest.STATUS_CHOICES):
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    pool.status = status_choice
    pool.save()
    return Response({'message': f'Pool {status_choice}'})


############################################
# Fertilizer Advisor (simple rule-based API)
############################################

@api_view(['POST'])
def fertilizer_advice(request):
    """Return simple fertilizer recommendations by crop and soil type.

    Expected JSON body: { crop: str, soil: str, area: str|number }
    """
    crop = request.data.get('crop')
    soil = request.data.get('soil')
    area = request.data.get('area')

    # Minimal guardrails
    if not crop or not soil:
        return Response({
            'error': 'Both crop and soil are required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    recommendations = {
        ("Wheat", "Loamy"): {"N": "120 kg/ha", "P": "60 kg/ha", "K": "40 kg/ha"},
        ("Rice", "Clay"): {"N": "100 kg/ha", "P": "50 kg/ha", "K": "50 kg/ha"},
        ("Cotton", "Sandy"): {"N": "150 kg/ha", "P": "75 kg/ha", "K": "75 kg/ha"},
        ("Maize", "Alluvial"): {"N": "140 kg/ha", "P": "60 kg/ha", "K": "50 kg/ha"},
    }

    fertilizer = recommendations.get((crop, soil), {"N": "100 kg/ha", "P": "50 kg/ha", "K": "50 kg/ha"})

    advice_text = (
        f"For {crop} grown on {soil} soil, apply fertilizers based on the ratio N:P:K as above. "
        "Split Nitrogen dose: half at sowing, rest during flowering."
    )

    return Response({
        "crop": crop,
        "soil": soil,
        "area": area,
        "fertilizer": fertilizer,
        "advice": advice_text,
    })


@api_view(['PUT'])
@permission_classes([IsAdminUser])
def assign_vehicle(request, pk):
    """Assign a vehicle to a transport request (admin only).

    Body: { "vehicle_id": <int>, "status": <optional: PENDING|APPROVED|REJECTED> }
    """
    try:
        pool = TransportRequest.objects.get(pk=pk)
    except TransportRequest.DoesNotExist:
        return Response({'error': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    vehicle_id = request.data.get('vehicle_id')
    if not vehicle_id:
        return Response({'error': 'vehicle_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        vehicle = Vehicle.objects.get(pk=vehicle_id)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)

    pool.matched_vehicle = vehicle

    # Optionally allow status update together with assignment
    status_choice = request.data.get('status')
    if status_choice:
        if status_choice not in dict(TransportRequest.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        pool.status = status_choice

    pool.save()
    serializer = TransportRequestSerializer(pool)
    return Response(serializer.data)


# Current user endpoint for role detection
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    data = {
        'id': user.id,
        'username': user.username,
        'is_admin': user.is_staff,
        
        'is_farmer': hasattr(user, 'farmer'),
    }
    return Response(data)


# -------------------------------------
# AgriPool 2.0: Pool Offers & Join flow
# -------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def pool_offers_list_create(request):
    """GET approved pool offers (with simple filters); POST create a new pool offer by provider farmer."""
    if request.method == 'GET':
        # Market listing: by default show only APPROVED and not completed
        qs = TransportPool.objects.filter(is_completed=False)
        status_q = (request.query_params.get('status') or STATUS_APPROVED)
        if status_q:
            qs = qs.filter(status=status_q.upper())
        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')
        date = request.query_params.get('date')
        mine = request.query_params.get('mine')
        if origin:
            qs = qs.filter(origin__icontains=origin)
        if destination:
            qs = qs.filter(destination__icontains=destination)
        if date:
            qs = qs.filter(date=date)
        # If mine=true, only return pools created by the current farmer
        if mine and mine.lower() in ('1', 'true', 'yes'): 
            try:
                farmer = request.user.farmer
                qs = qs.filter(provider=farmer)
            except Exception:
                qs = qs.none()
        serializer = TransportPoolSerializer(qs, many=True)
        return Response(serializer.data)

    # POST - provider creates pool offer
    try:
        farmer = request.user.farmer
    except Exception:
        return Response({"detail": "Only farmers can create pools."}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data['provider'] = farmer.id
    serializer = TransportPoolSerializer(data=data)
    if serializer.is_valid():
        created_pool = serializer.save(provider=farmer)
        return Response(TransportPoolSerializer(created_pool).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def pool_offer_detail(request, pk):
    pool = get_object_or_404(TransportPool, pk=pk)

    if request.method == 'GET':
        serializer = TransportPoolSerializer(pool)
        return Response(serializer.data)

    # DELETE - only the provider (or admin) can delete; forbid when approved joins exist
    user = request.user
    is_owner = hasattr(user, 'farmer') and getattr(pool.provider, 'id', None) == user.farmer.id
    if not (user.is_staff or is_owner):
        return Response({'detail': 'Not permitted to delete this pool offer.'}, status=status.HTTP_403_FORBIDDEN)

    # Enforce policy: deletion is only allowed after the pool has been REJECTED
    if (pool.status or '').upper() != 'REJECTED':
        return Response({'detail': 'Pool must be REJECTED before deletion.'}, status=status.HTTP_400_BAD_REQUEST)

    # Safer query without relying on reverse related_name for static analyzers
    if PoolJoinRequest.objects.filter(pool=pool, status=STATUS_APPROVED).exists():
        return Response({'detail': 'Cannot delete a pool that has approved joiners.'}, status=status.HTTP_400_BAD_REQUEST)

    pool.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_pool_offer(request, pk):
    """Create a join request for pool offer pk."""
    try:
        pool = TransportPool.objects.get(pk=pk)
    except TransportPool.DoesNotExist:
        return Response({'detail': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    # Prevent joins on completed pools
    if getattr(pool, 'is_completed', False):
        return Response({'detail': 'This pool has been completed and no longer accepts join requests.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        farmer = request.user.farmer
    except Exception:
        return Response({"detail": "Only farmers can request to join pools."}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data.copy()
    payload['pool'] = pool.pk
    serializer = PoolJoinRequestSerializer(data=payload)
    if serializer.is_valid():
        jr = serializer.save(requester=farmer, pool=pool)
        # Notification to provider
        try:
            Notification.objects.create(
                user=pool.provider.user,
                message=f"New join request by {farmer.user.username} for {pool.origin} → {pool.destination}",
                link='/my-pools',
            )
        except Exception:
            pass
        return Response(PoolJoinRequestSerializer(jr).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def complete_pool_offer(request, pk):
    """Provider marks a pool offer as completed; freezes further joins and notifies joiners."""
    # Use get_object_or_404 and annotate type to help static analyzers
    pool: TransportPool = get_object_or_404(TransportPool, pk=pk)

    # Only the provider can complete their pool (or admin)
    user = request.user
    is_owner = hasattr(user, 'farmer') and getattr(pool.provider, 'id', None) == user.farmer.id
    if not (user.is_staff or is_owner):
        return Response({'detail': 'Not authorized to complete this pool.'}, status=status.HTTP_403_FORBIDDEN)

    if getattr(pool, 'is_completed', False):
        return Response({'detail': 'Pool already completed.'}, status=status.HTTP_400_BAD_REQUEST)

    pool.is_completed = True
    pool.completed_at = timezone.now()
    pool.save(update_fields=['is_completed', 'completed_at', 'updated_at'])

    # Notify all requesters of this pool (approved and pending) that pool is completed
    try:
        req_user_ids = list(
            PoolJoinRequest.objects.filter(pool=pool)
            .values_list('requester__user_id', flat=True)
        )
        for uid in set(req_user_ids):
            try:
                u = User.objects.get(pk=uid)
                Notification.objects.create(
                    user=u,
                    message=f"Pool {pool.origin} → {pool.destination} on {pool.date} has been marked completed.",
                    link='/my-join-requests'
                )
            except Exception:
                pass
    except Exception:
        pass

    return Response({'status': 'completed', 'pool_id': int(pool.pk)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_join_requests(request):
    try:
        farmer = request.user.farmer
    except Exception:
        return Response([], status=status.HTTP_200_OK)
    qs = PoolJoinRequest.objects.filter(requester=farmer)
    serializer = PoolJoinRequestSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_join_requests(request):
    qs = PoolJoinRequest.objects.all()
    serializer = PoolJoinRequestSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_join_request(request, pk):
    try:
        jr = PoolJoinRequest.objects.get(pk=pk)
    except PoolJoinRequest.DoesNotExist:
        return Response({'detail': 'Join request not found'}, status=status.HTTP_404_NOT_FOUND)

    if jr.status != STATUS_PENDING:
        return Response({'detail': 'Join request is not pending'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            jr.approve()
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Notify requester
    try:
        Notification.objects.create(
            user=jr.requester.user,
            message=f"Your join request was approved for {jr.pool.origin} → {jr.pool.destination}",
            link='/my-join-requests',
        )
    except Exception:
        pass
    return Response(PoolJoinRequestSerializer(jr).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_join_request(request, pk):
    try:
        jr = PoolJoinRequest.objects.get(pk=pk)
    except PoolJoinRequest.DoesNotExist:
        return Response({'detail': 'Join request not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        jr.reject()
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Notify requester
    try:
        Notification.objects.create(
            user=jr.requester.user,
            message=f"Your join request was rejected for {jr.pool.origin} → {jr.pool.destination}",
            link='/my-join-requests',
        )
    except Exception:
        pass
    return Response(PoolJoinRequestSerializer(jr).data)


# ------------------------
# Notifications endpoints
# ------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    qs = Notification.objects.filter(user=request.user)
    unread = request.query_params.get('unread')
    if unread and unread.lower() in ('1', 'true', 'yes'):
        qs = qs.filter(is_read=False)
    limit = int(request.query_params.get('limit', 20))
    qs = qs.order_by('-created_at')[:limit]
    return Response(NotificationSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notifications_mark_read(request):
    ids = request.data.get('ids')
    qs = Notification.objects.filter(user=request.user, is_read=False)
    if isinstance(ids, list) and ids:
        qs = qs.filter(id__in=ids)
    qs.update(is_read=True)
    return Response({'updated': True})


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_pool_admin(request, pk):
    """Admin approves a pool offer (so it appears to others)."""
    try:
        pool = TransportPool.objects.get(pk=pk)
    except TransportPool.DoesNotExist:
        return Response({'detail': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = (request.data.get('status') or 'APPROVED').upper()
    if new_status not in [STATUS_PENDING, STATUS_APPROVED, 'REJECTED']:
        return Response({'detail': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    pool.status = new_status
    if new_status == STATUS_APPROVED and (pool.available_capacity is None or pool.available_capacity <= 0):
        pool.available_capacity = pool.total_capacity
    pool.save(update_fields=['status', 'available_capacity', 'updated_at'])
    return Response(TransportPoolSerializer(pool).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pool_joiners(request, pk):
    """Return join requests for a given pool offer. Only provider (owner) or admin can view."""
    try:
        pool = TransportPool.objects.get(pk=pk)
    except TransportPool.DoesNotExist:
        return Response({'detail': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    is_owner = hasattr(user, 'farmer') and getattr(pool.provider, 'id', None) == user.farmer.id
    if not (user.is_staff or is_owner):
        return Response({'detail': 'Not authorized to view joiners of this pool.'}, status=status.HTTP_403_FORBIDDEN)

    joins = PoolJoinRequest.objects.filter(pool=pool).order_by('-date_created')
    serializer = PoolJoinRequestSerializer(joins, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def assign_vehicle_to_pool(request, pk):
    """Admin can assign or change the vehicle for a pool and optionally change status."""
    try:
        pool = TransportPool.objects.get(pk=pk)
    except TransportPool.DoesNotExist:
        return Response({'detail': 'Pool not found'}, status=status.HTTP_404_NOT_FOUND)

    vehicle_id = request.data.get('vehicle_id')
    if vehicle_id is None:
        return Response({'detail': 'vehicle_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        vehicle = Vehicle.objects.get(pk=vehicle_id)
    except Vehicle.DoesNotExist:
        return Response({'detail': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)

    status_val = request.data.get('status')
    updates = {'vehicle': vehicle}
    if status_val:
        updates['status'] = status_val.upper()
    TransportPool.objects.filter(pk=pk).update(**updates)
    # reload instance for response
    pool.refresh_from_db()
    return Response(TransportPoolSerializer(pool).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_pool_offers(request):
    """Admin list of all pool offers with optional status filter."""
    qs = TransportPool.objects.all().order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter.upper())
    serializer = TransportPoolSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_summary(request):
    """Lightweight admin summary counts for dashboard cards."""
    total_offers = TransportPool.objects.count()
    pending_offers = TransportPool.objects.filter(status=STATUS_PENDING).count()
    approved_offers = TransportPool.objects.filter(status=STATUS_APPROVED).count()
    total_vehicles = Vehicle.objects.count()
    return Response({
        'total_offers': total_offers,
        'pending_offers': pending_offers,
        'approved_offers': approved_offers,
        'total_vehicles': total_vehicles,
    })


# ------------------------
# Dashboard summary (farmer)
# ------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_dashboard_summary(request):
    """
    Summary metrics for the logged-in farmer/provider.
    Returns:
    - total_earnings: sum of provider_share for pools they provided
    - requests: counts of their join requests by status
    - monthly_earnings: [{ month: 'YYYY-MM', earnings: float }]
    - active_pools: top 5 approved pools (id, origin, destination, total_capacity, status, date)
    """
    try:
        farmer = Farmer.objects.get(user=request.user)
    except Farmer.DoesNotExist:
        return Response({
            'total_earnings': 0.0,
            'requests': {'APPROVED': 0, 'PENDING': 0, 'REJECTED': 0},
            'monthly_earnings': [],
            'active_pools': [],
        })

    pools_qs = TransportPool.objects.filter(provider=farmer)
    agg = pools_qs.aggregate(total=Sum('provider_share'))
    total_earnings = float(agg.get('total') or 0.0)

    # Monthly earnings from pool.date (provider share)
    monthly_rows = (
        pools_qs
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(earnings=Sum('provider_share'))
        .order_by('month')
    )
    monthly_earnings = [
        {
            'month': (row['month'].strftime('%Y-%m') if row['month'] else ''),
            'earnings': float(row['earnings'] or 0.0),
        }
        for row in monthly_rows
    ]

    # Monthly projection: projected (sum of total_cost) vs actual (sum of provider_share)
    # Monthly projection: projected (sum of total_cost) vs actual (sum of provider_share for completed pools)
    monthly_proj_rows = (
        pools_qs
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(projected=Sum('total_cost'))
        .order_by('month')
    )
    # Build a dict month -> projected, and compute actuals from completed-only subset
    monthly_projection_map = {}
    for row in monthly_proj_rows:
        key = row['month'].strftime('%Y-%m') if row['month'] else ''
        monthly_projection_map[key] = {
            'projected': float(row['projected'] or 0.0),
            'actual': 0.0,
        }

    completed_rows = (
        pools_qs.filter(is_completed=True)
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(actual=Sum('provider_share'))
        .order_by('month')
    )
    for row in completed_rows:
        key = row['month'].strftime('%Y-%m') if row['month'] else ''
        if key not in monthly_projection_map:
            monthly_projection_map[key] = {'projected': 0.0, 'actual': 0.0}
        monthly_projection_map[key]['actual'] = float(row['actual'] or 0.0)

    monthly_projection = [
        {'month': k, 'projected': v['projected'], 'actual': v['actual']}
        for k, v in sorted(monthly_projection_map.items())
    ]

    # Join requests counts for this farmer as requester (requests made)
    req_counts_qs = (
        PoolJoinRequest.objects.filter(requester=farmer)
        .values('status')
        .annotate(c=Count('id'))
    )
    requests_made = {'APPROVED': 0, 'PENDING': 0, 'REJECTED': 0}
    for row in req_counts_qs:
        s = (row['status'] or '').upper()
        if s in requests_made:
            requests_made[s] = int(row['c'] or 0)

    # Join requests counts received on pools provided by this farmer (requests received)
    recv_counts_qs = (
        PoolJoinRequest.objects.filter(pool__provider=farmer)
        .values('status')
        .annotate(c=Count('id'))
    )
    requests_received = {'APPROVED': 0, 'PENDING': 0, 'REJECTED': 0}
    for row in recv_counts_qs:
        s = (row['status'] or '').upper()
        if s in requests_received:
            requests_received[s] = int(row['c'] or 0)

    active_qs = pools_qs.filter(status=STATUS_APPROVED).order_by('-date')[:5]
    active_pools = [
        {
            'id': p.pk,
            'origin': p.origin,
            'destination': p.destination,
            'date': p.date.isoformat() if p.date else None,
            'total_capacity': p.total_capacity,
            'status': p.status,
        }
        for p in active_qs
    ]

    # Recent joiners list (latest 5) on farmer's pools
    recent_qs = (
        PoolJoinRequest.objects
        .filter(pool__provider=farmer)
        .select_related('requester__user', 'pool')
        .order_by('-date_created')[:5]
    )
    recent_joiners = [
        {
            'id': jr.pk,
            'requester_username': getattr(jr.requester.user, 'username', ''),
            'produce_type': jr.produce_type,
            'quantity': jr.quantity,
            'status': jr.status,
            'date_created': jr.date_created.isoformat() if jr.date_created else None,
            'pool': {
                'id': jr.pool.pk,
                'origin': jr.pool.origin,
                'destination': jr.pool.destination,
                'date': jr.pool.date.isoformat() if jr.pool.date else None,
            }
        }
        for jr in recent_qs
    ]

    # Produce type breakdown based on join requests received (activity share)
    prod_rows = (
        PoolJoinRequest.objects.filter(pool__provider=farmer)
        .values('produce_type')
        .annotate(total_qty=Sum('quantity'), count=Count('id'))
        .order_by('-total_qty')
    )
    produce_breakdown = [
        {
            'produce_type': row['produce_type'] or 'Unknown',
            'total_qty': float(row['total_qty'] or 0.0),
            'count': int(row['count'] or 0),
        }
        for row in prod_rows
    ]

    # Completed pools count and actual revenue from completed pools
    completed_pools = pools_qs.filter(is_completed=True).count()
    actual_revenue = float((pools_qs.filter(is_completed=True).aggregate(s=Sum('provider_share'))['s'] or 0.0))

    return Response({
        'total_earnings': total_earnings,
        'requests_made': requests_made,
        'requests_received': requests_received,
        'monthly_earnings': monthly_earnings,
        'monthly_projection': monthly_projection,
        'active_pools': active_pools,
        'recent_joiners': recent_joiners,
        'produce_breakdown': produce_breakdown,
        'completed_pools': completed_pools,
        'actual_revenue': actual_revenue,
    })


# ------------------------
# Farmer Profile API
# ------------------------
class FarmerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = FarmerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        from .models import FarmerProfile
        profile, _ = FarmerProfile.objects.get_or_create(user=self.request.user)
        return profile


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_pools(request):
    """Basic recommendations by location: pools whose origin or destination matches user's profile.location."""
    from django.db.models import Q
    location = ''
    try:
        profile = request.user.farmerprofile
        location = (profile.location or '').strip()
    except Exception:
        pass

    qs = TransportPool.objects.filter(status=STATUS_APPROVED, is_completed=False)
    if location:
        qs = qs.filter(Q(origin__icontains=location) | Q(destination__icontains=location))
    qs = qs.order_by('-date')[:5]
    return Response(TransportPoolSerializer(qs, many=True).data)
