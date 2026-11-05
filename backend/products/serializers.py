from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    # ModelSerializer builds its validation from the model: required fields,
    # max lengths, URL format and the minimum value of 0 for price and stock.

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "category",
            "price",
            "stock_quantity",
            "image_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        # DRF replaces the model's MinValueValidator with its own min_value check,
        # so the friendly messages have to be set here too.
        extra_kwargs = {
            "price": {"error_messages": {"min_value": "Price cannot be negative."}},
            "stock_quantity": {
                "error_messages": {"min_value": "Stock quantity cannot be negative."}
            },
        }

    # The methods below add rules the model alone does not enforce:
    # a name or category made only of spaces is treated as blank.

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Product name cannot be blank.")
        return value

    def validate_category(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category cannot be blank.")
        return value
