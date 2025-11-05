from django.urls import path, include
from rest_framework import routers
from .views import (
    FarmerViewSet,
    VehicleViewSet,
    TransportRequestViewSet,
    api_overview,
    signup,
    user_pools,
    admin_pools,
    approve_pool,
    assign_vehicle,
    # AgriPool 2.0
    pool_offers_list_create,
    pool_offer_detail,
    pool_joiners,
    join_pool_offer,
    complete_pool_offer,
    my_join_requests,
    admin_join_requests,
    approve_join_request,
    reject_join_request,
    approve_pool_admin,
    assign_vehicle_to_pool,
    admin_pool_offers,
    admin_summary,
    my_dashboard_summary,
    notifications_list,
    notifications_mark_read,
    FarmerProfileView,
    recommended_pools,
    fertilizer_advice,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import get_current_user

router = routers.DefaultRouter()
router.register(r'farmers', FarmerViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'requests', TransportRequestViewSet)

urlpatterns = [
    path('', api_overview),
    path('', include(router.urls)),
    # Auth + Pool routes
    path('signup/', signup),
    path('pools/', user_pools),
    path('admin/pools/', admin_pools),
    path('admin/pools/<int:pk>/approve/', approve_pool),
    path('admin/pools/<int:pk>/assign/', assign_vehicle),
    # AgriPool 2.0 (offers + joins) – parallel to existing endpoints
    path('pool-offers/', pool_offers_list_create),
    path('pool-offers/<int:pk>/', pool_offer_detail),
    path('pool-offers/<int:pk>/joiners/', pool_joiners),
    path('pool-offers/<int:pk>/join/', join_pool_offer),
    path('pool-offers/<int:pk>/complete/', complete_pool_offer),
    path(' /', my_join_requests),
    path('admin/join-requests/', admin_join_requests),
    path('admin/join-requests/<int:pk>/approve/', approve_join_request),
    path('admin/join-requests/<int:pk>/reject/', reject_join_request),
    path('admin/pool-offers/<int:pk>/approve/', approve_pool_admin),
    path('admin/pool-offers/<int:pk>/assign/', assign_vehicle_to_pool),
    path('admin/pool-offers/', admin_pool_offers),
    path('admin/summary/', admin_summary),
    path('dashboard/summary/', my_dashboard_summary),
    path('notifications/', notifications_list),
    path('notifications/mark_read/', notifications_mark_read),
    path('farmer/profile/', FarmerProfileView.as_view()),
    path('pools/recommendations/', recommended_pools),
    path('fertilizer/advice/', fertilizer_advice),
    path('me/', get_current_user, name='current-user'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
