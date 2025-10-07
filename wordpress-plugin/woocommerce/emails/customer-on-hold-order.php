<?php
/**
 * Customer On Hold Order Email Template (E-Transfer Override)
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/emails/customer-on-hold-order.php
 *
 * @see https://docs.woocommerce.com/document/template-structure/
 * @package WooCommerce/Templates/Emails
 * @version 3.7.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action('woocommerce_email_header', $email_heading, $email); ?>

<?php /* translators: %s: Customer first name */ ?>
<p><?php printf(esc_html__('Hi %s,', 'woocommerce'), esc_html($order->get_billing_first_name())); ?></p>

<p><?php esc_html_e('Thank you for your order. Your order is currently on hold and awaiting payment via e-Transfer.', 'woocommerce'); ?></p>

<?php
// Add our custom e-Transfer payment instructions for this email type
if ($order->get_payment_method() === 'etransfer') {
    // Include our custom payment instructions template
    wc_get_template('emails/email-etransfer-instructions.php', array(
        'order' => $order,
        'email' => $email,
        'sent_to_admin' => $sent_to_admin,
        'plain_text' => $plain_text
    ), '', ETRANSFER_WC_PLUGIN_DIR . 'templates/');
}
?>

<?php
/*
 * @hooked WC_Emails::order_details() Shows the order details table.
 * @hooked WC_Structured_Data::generate_order_data() Generates structured data.
 * @hooked WC_Structured_Data::output_structured_data() Outputs structured data.
 * @since 2.5.0
 */
do_action('woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email);

/*
 * @hooked WC_Emails::order_meta() Shows order meta data.
 */
do_action('woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email);

/*
 * @hooked WC_Emails::customer_details() Shows customer details
 * @hooked WC_Emails::email_address() Shows email address
 */
do_action('woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email);

/**
 * Show user-defined additional content - this is set in each email's settings.
 */
if ($additional_content) {
    echo wp_kses_post(wpautop(wptexturize($additional_content)));
}

/*
 * @hooked WC_Emails::email_footer() Output the email footer
 */
do_action('woocommerce_email_footer', $email);