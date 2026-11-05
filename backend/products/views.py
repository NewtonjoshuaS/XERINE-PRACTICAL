from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for products.

    Supports optional query parameters on the list endpoint:
      ?search=<text>      case-insensitive match on product name
      ?category=<name>    exact (case-insensitive) category match
    """

    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all()
        search = self.request.query_params.get("search", "").strip()
        category = self.request.query_params.get("category", "").strip()

        if search:
            queryset = queryset.filter(name__icontains=search)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset

    @action(detail=False, methods=["get"])
    def categories(self, request):
        """Each category with its product count, e.g. [{"category": "Home", "count": 3}].

        The frontend uses this for the category dropdown and the overall total.
        """
        rows = (
            Product.objects.values("category")
            .annotate(count=Count("id"))
            .order_by("category")
        )
        return Response(list(rows))
