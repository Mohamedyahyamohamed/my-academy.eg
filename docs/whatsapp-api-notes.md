# WhatsApp Cloud API implementation notes

According to Meta's official documentation:

- Media upload uses `POST /PHONE_NUMBER_ID/media` with multipart form-data containing `messaging_product=whatsapp`, `type`, and `file`, authenticated with the WhatsApp access token.
- A successful upload returns a media ID. Media IDs persist for up to 30 days; the application may delete the uploaded media after sending.
- Image messages use `POST /PHONE_NUMBER_ID/messages` with `type=image` and an `image` object containing the uploaded media `id` and optional `caption`.
- PNG and JPEG images are supported up to 5 MB. The generated student QR PNG is far below this limit.

Sources:

- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media
- https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/image-messages
