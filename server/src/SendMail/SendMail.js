const createMailTransport = require('./mailTransport');

const sendMail = async (email) => {
    try {
        const transport = await createMailTransport();
        const info = await transport.sendMail({
            from: `"GLAB 👻" <${process.env.EMAIL_USER}>`, // sender address
            to: email, // list of receivers
            subject: 'Thanks', // Subject line
            text: 'Hello world?', // plain text body
            html: `<b>
            Dear ${email}
            Alibarbie sincerely thanks you for choosing to trust and purchase our products.
            We would like to extend our heartfelt thanks to you for choosing to shop with us. This is greatly appreciated by us, and we are delighted to have the opportunity to serve you.
            Your trust and selection of our products/services not only show your support but also inspire us to continuously improve and provide the best experiences for our customers.
            If you have any questions about your order or need further assistance, please contact us at Email. We are always ready to assist you.
            Once again, we sincerely thank you for accompanying us on this journey. We look forward to serving you again in the future.
            Best regards,
            Alibarbie</b>`,
        });
    } catch (error) {
        console.log('Error sending email:', error);
    }
};

module.exports = sendMail;
