# Contact Identity Service

This service provides endpoints to identify and manage contacts based on email and phone number. It is designed to handle primary and secondary contact associations.

## Endpoints

### Identify Contact

**POST** `/identify`

#### Request Payload

```json
{
    "email": "",
    "phoneNumber": ""
}

```response example
{
    "contact": {
        "primaryContactId": 1,
        "emails": ["example@example.com", "example2@example.com"],
        "phoneNumbers": ["1234567890", "0987654321"],
        "secondaryContactIds": [2, 3]
    }
}
