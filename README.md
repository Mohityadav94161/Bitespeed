# Contact Identity Service

This service provides endpoints to identify and manage contacts based on email and phone number. 

## Usage
**Link for POST Request**
To identify a contact, send a POST request to:

https://bitespeed-1mqd.onrender.com/identify

#### Schema
```json
{
    "email": "",
    "phoneNumber": ""
}
```

**Note:** If you receive a **Not Found** error, please wait for a few seconds and try again, as it is hosted on a free server which may take some time to wake up.


### Running Locally

**To run this project locally:**

```
Clone the repository.
Install dependencies: npm install
Start the server: npm start
```

### Project Structure

**models/contact.js:** Sequelize model definitions for the Contacts table.
**index.js:** Main server file containing the endpoint logic.
**test_data.json:** JSON file containing test data.
**test.js:** Contains test files for the service.



## Endpoints

### Identify Contact

**POST** `/identify`

#### Request Payload

```json
{
    "email": "",
    "phoneNumber": ""
}
```
#### Response Example
```
{
    "contact": {
        "primaryContactId": 1,
        "emails": ["example@example.com", "example2@example.com"],
        "phoneNumbers": ["1234567890", "0987654321"],
        "secondaryContactIds": [2, 3]
    }
}
```

### Print Table
**GET** `/printTable`

This endpoint prints the current state of the Contacts table in a human-readable format.

#### Response Example
```
┌───────┬───────────────┬─────────────────────────────┬─────────────┬────────────────────┬─────────────────────────────┬─────────────────────────────┬─────────────────────────────┐
│ ID    │ Phone Number  │ Email                       │ Linked ID   │ Link Precedence    │ Created At                  │ Updated At                  │ Deleted At                  │
├───────┼───────────────┼─────────────────────────────┼─────────────┼────────────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 1     │ 919191        │ george@hillvalley.edu       │ null        │ primary            │ 2023-04-11 00:00:00.374+00  │ 2023-04-11 00:00:00.374+00  │ null                        │
│ 2     │ 717171        │ biffsucks@hillvalley.edu    │ null        │ primary            │ 2023-04-21 05:30:00.11+00   │ 2023-04-21 05:30:00.11+00   │ null                        │
...
```
### Delete Table
**POST** `/deleteTable`

This endpoint deletes all entries in the Contacts table.

#### Response Example
```json
{
    "message": "Contacts table deleted."
}
```

