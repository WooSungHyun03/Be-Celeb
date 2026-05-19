from __future__ import annotations

from pydantic import BaseModel, Field


class ShopProduct(BaseModel):
    id: str | None = None
    source: str = "naver"
    sourceProductId: str | None = None
    title: str
    imageUrl: str | None = None
    price: int | None = None
    mallName: str | None = None
    productUrl: str
    brand: str | None = None
    maker: str | None = None
    category: str | None = None
    creatorCategory: str
    searchKeyword: str
    collectedAt: str | None = None


class ShopProductsResponse(BaseModel):
    category: str
    query: str | None = None
    source: str = "naver"
    fromCache: bool
    products: list[ShopProduct] = Field(default_factory=list)


class ShopCollectionSummary(BaseModel):
    ok: bool = True
    categoriesChecked: int
    keywordsChecked: int
    productsUpserted: int
    errors: list[dict[str, str]] = Field(default_factory=list)
