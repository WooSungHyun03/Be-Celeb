from pydantic import BaseModel, ConfigDict, Field


class ChannelSettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    channel_url: str = Field(alias="channelUrl", min_length=1)
    category: str = Field(min_length=1)
