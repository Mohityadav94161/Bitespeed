import express from 'express';
import bodyParser from 'body-parser';
import { sequelize, Contact } from './models/contact.js';
import { Op } from 'sequelize';

const app = express();

app.use(bodyParser.json({limit:'50mb'}));



app.post('/identify', async (req, res) => {
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


   
app.get('/',(req,res)=>{
    res.send('you hit the right server, now make a post request with email or number or both to /identify')
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
