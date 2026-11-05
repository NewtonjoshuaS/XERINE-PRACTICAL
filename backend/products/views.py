from rest_framework import viewsets

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
