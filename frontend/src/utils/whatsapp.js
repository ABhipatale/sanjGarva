/**
 * WhatsApp click-to-chat. Opens WhatsApp with the message filled in; the owner taps Send.
 * (Sending with no tap at all needs the paid WhatsApp Business API.)
 */
export function whatsappNumber(mobile) {
  const phone = String(mobile || '').replace(/[^\d]/g, '')
  return phone.length === 10 ? `91${phone}` : phone
}

/** Without a number WhatsApp asks which chat to send to. */
export function openWhatsApp(mobile, text) {
  const number = whatsappNumber(mobile)
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
