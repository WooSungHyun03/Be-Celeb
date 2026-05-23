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
    equipmentCategory: str
    searchKeyword: str
    popularityScore: float = 0
    recommendedLevel: str | None = None
    collectedAt: str | None = None


class ShopSectionInfo(BaseModel):
    equipmentCategory: str
    keywords: list[str]


class ShopSection(BaseModel):
    equipmentCategory: str
    items: list[ShopProduct] = Field(default_factory=list)
    error: str | None = None
    isFallback: bool = False


class ShopSectionsResponse(BaseModel):
    sections: list[ShopSection] = Field(default_factory=list)


class ShopSet(BaseModel):
    level: str
    title: str
    description: str | None = None
    items: list[str] = Field(default_factory=list)
    products: list[ShopProduct] = Field(default_factory=list)


class ShopSetsResponse(BaseModel):
    sets: list[ShopSet] = Field(default_factory=list)


class ShopCollectionSummary(BaseModel):
    ok: bool = True
    sectionsChecked: int
    keywordsChecked: int
    productsUpserted: int
    errors: list[dict[str, str]] = Field(default_factory=list)
