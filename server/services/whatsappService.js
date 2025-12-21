/**
 * Generate WhatsApp Web link with pre-filled message
 * Opens WhatsApp with the specified number and message
 */
export function generateWhatsAppLink(phoneNumber, message, invoicePath = null) {
    // Remove all non-digit characters from phone number
    const cleanPhone = formatPhoneNumber(phoneNumber);

    // Encode message for URL (no manual attachment note - that's only for admin)
    const encodedMessage = encodeURIComponent(message);

    // Generate WhatsApp Web link
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    return { whatsappLink, invoicePath };
}

/**
 * Format phone number for WhatsApp (international format)
 */
export function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
        cleaned = '91' + cleaned.substring(1);
    }

    // If it doesn't start with country code, add it
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
}
