from rest_framework import status
from rest_framework.test import APITestCase

from .models import Product


class ProductApiTests(APITestCase):
    list_url = "/api/products/"

    def setUp(self):
        self.phone = Product.objects.create(
            name="Smartphone X", category="Electronics", price="450.00", stock_quantity=10
        )
        self.shirt = Product.objects.create(
            name="Cotton Shirt", category="Clothing", price="25.00", stock_quantity=40
        )

    def detail_url(self, product_id):
        return f"{self.list_url}{product_id}/"

    def valid_payload(self, **overrides):
        payload = {
            "name": "Desk Lamp",
            "description": "LED lamp",
            "category": "Home",
            "price": "19.99",
            "stock_quantity": 5,
            "image_url": "https://example.com/lamp.jpg",
        }
        payload.update(overrides)
        return payload

    def test_create_product(self):
        response = self.client.post(self.list_url, self.valid_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 3)
        self.assertIn("created_at", response.data)

    def test_list_products(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_retrieve_product(self):
        response = self.client.get(self.detail_url(self.phone.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Smartphone X")

    def test_retrieve_missing_product_returns_404(self):
        response = self.client.get(self.detail_url(9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_product(self):
        payload = self.valid_payload(name="Smartphone X", category="Electronics",
                                     price="399.00", stock_quantity=7)
        response = self.client.put(self.detail_url(self.phone.id), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.phone.refresh_from_db()
        self.assertEqual(str(self.phone.price), "399.00")
        self.assertEqual(self.phone.stock_quantity, 7)

    def test_delete_product(self):
        response = self.client.delete(self.detail_url(self.phone.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.phone.id).exists())
