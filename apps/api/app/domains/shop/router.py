from fastapi import APIRouter

from app.domains.shop.controller import collect_shop_products_cron, shop_products

router = APIRouter(tags=["shop"])

router.add_api_route("/api/shop/products", shop_products, methods=["GET"], response_model=None)
router.add_api_route("/api/cron/collect-shop-products", collect_shop_products_cron, methods=["POST"], response_model=None)
