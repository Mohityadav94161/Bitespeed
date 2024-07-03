import express from 'express';
import bodyParser from 'body-parser';
import { sequelize, Contact } from './models/contact.js';
import { Op } from 'sequelize';
import morgan from 'morgan';
import os from 'os'


const app = express();

// Logging middleware setup
app.use(morgan((tokens, req, res) => {
    return [
        `[${new Date().toLocaleString()}]`,
        `[${os.hostname()}]`,
        `[${req.ip}]`,
        `[${req.connection.remoteAddress}]`,
        `[${tokens.method(req, res)}]`,
        `[${tokens.url(req, res)}]`,
        `[${tokens.status(req, res)}]`,
        `[${tokens.res(req, res, 'content-length')}] -`,
        `[${tokens['response-time'](req, res)}ms]`
    ].join(' ');
}));

app.use(bodyParser.json({limit:'50mb'}));

//to parse the data
app.use(bodyParser.urlencoded({ extended: true }));



app.post('/identify', async (req, res) => {
    // console.log(req.headers)
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).send({ error: 'Either email or phone number is required' });
    }

    try {
        await sequelize.sync();

        // Find if any contact exists with the given email or phone number
        const contacts = await Contact.findAll({
            where: {
                [Op.or]: [
                    { email: email || null },
                    { phoneNumber: phoneNumber || null }
                ]
            }
        });

        if (contacts.length === 0) {
            // No existing contacts, create a new primary contact
            const newContact = await Contact.create({
                email,
                phoneNumber,
                linkedId: null,
                linkPrecedence: 'primary',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null
            });

            return res.status(200).send({
                contact: {
                    primaryContactId: newContact.id,
                    emails: [newContact.email],
                    phoneNumbers: [newContact.phoneNumber],
                    secondaryContactIds: []
                }
            });
        }

        // find all the primary contact
        let primaryContact = contacts.find(contact => contact.linkPrecedence === 'primary');

        // may be any case where the primary contact is deleted or something else , means it may be the edge case(according to me)
        // If no primary contact found, pick the oldest contact as primary
        if (!primaryContact) {
            
            primaryContact = contacts.sort((a, b) => a.createdAt - b.createdAt)[0];
            primaryContact.linkPrecedence = 'primary';
            await primaryContact.save();
        }

        // Check if the incoming request  turning an existing primary contact into a secondary contact
        // so select the latest primary contact as oldest contact remain primary
        const conflictingPrimaryContact = contacts.find(contact =>
            contact.linkPrecedence === 'primary' &&
            contact.id !== primaryContact.id &&
            (contact.email === email || contact.phoneNumber === phoneNumber)
        );

        if (conflictingPrimaryContact) {
            conflictingPrimaryContact.linkPrecedence = 'secondary';
            conflictingPrimaryContact.linkedId = primaryContact.id;
            await conflictingPrimaryContact.save();
        }

        //now for secondary contact cases
        // Check for secondary contact creation
        let newSecondaryContact = null;

        // Check if email or phoneNumber is different and not already linked
        const existingEmails = contacts.map(contact => contact.email).filter(e => e);
        const existingPhoneNumbers = contacts.map(contact => contact.phoneNumber).filter(p => p);

        if (!existingEmails.includes(email) || !existingPhoneNumbers.includes(phoneNumber)) {
            newSecondaryContact = await Contact.create({
                email,
                phoneNumber,
                linkedId: primaryContact.id,
                linkPrecedence: 'secondary',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null
            });
        }

        // Consolidate response data
        const primaryContactId = primaryContact.id;
        const emails = Array.from(new Set(contacts.map(contact => contact.email).filter(e => e)));
        const phoneNumbers = Array.from(new Set(contacts.map(contact => contact.phoneNumber).filter(p => p)));
        const secondaryContactIds = contacts
            .filter(contact => contact.linkPrecedence === 'secondary' && contact.linkedId === primaryContactId)
            .map(contact => contact.id);

        // making array of emails and  number    
        if (newSecondaryContact) {
            if (!emails.includes(newSecondaryContact.email)) emails.push(newSecondaryContact.email);
            if (!phoneNumbers.includes(newSecondaryContact.phoneNumber)) phoneNumbers.push(newSecondaryContact.phoneNumber);
            secondaryContactIds.push(newSecondaryContact.id);
        }

        return res.status(200).send({
            contact: {
                primaryContactId,
                emails,
                phoneNumbers,
                secondaryContactIds
            }
        });
    } catch (error) {
        console.error('Error processing identify request:', error);
        return res.status(500).send({ error: 'Internal Server Error' });
    }
});

// print the table
app.get('/printTable', async (req, res) => {
    try {
        const contacts = await Contact.findAll();

        let htmlTable = `
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Linked ID</th>
                        <th>Link Precedence</th>
                        <th>Created At</th>
                        <th>Updated At</th>
                        <th>Deleted At</th>
                    </tr>
                </thead>
                <tbody>
        `;

        contacts.forEach(contact => {
            htmlTable += `
                <tr>
                    <td>${contact.id}</td>
                    <td>${contact.phoneNumber || ''}</td>
                    <td>${contact.email || ''}</td>
                    <td>${contact.linkedId || ''}</td>
                    <td>${contact.linkPrecedence}</td>
                    <td>${contact.createdAt}</td>
                    <td>${contact.updatedAt}</td>
                    <td>${contact.deletedAt || ''}</td>
                </tr>
            `;
        });

        htmlTable += `
                </tbody>
            </table>
        `;

        res.status(200).send(htmlTable);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


   
app.get('/',(req,res)=>{
    res.send('you hit the right server, now make a post request with email or number or both to /identify')
})

//delete the table
app.post('/deleteTable', async (req, res) => {
    try {
        await Contact.destroy({ where: {} });
        res.status(200).send('Table deleted successfully.');
    } catch (error) {
        console.error('Error deleting table:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
