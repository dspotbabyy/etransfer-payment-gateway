<?php
/**
 * E-Transfer Payment Instructions Email Template
 *
 * This template shows e-Transfer payment instructions in WooCommerce emails
 *
 * @see https://docs.woocommerce.com/document/template-structure/
 * @package ETransfer_WooCommerce/Templates/Emails
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Log that our template is being loaded
error_log('E-Transfer template loaded for order #' . $order->get_order_number());
?>

<style type="text/css">
    /* E-Transfer specific email styles */
    .etransfer-payment-card {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 16px;
        padding: 30px;
        margin: 30px 0;
        text-align: center;
    }

    .etransfer-payment-title {
        font-size: 18px;
        font-weight: 600;
        color: #0c4a6e;
        margin-bottom: 20px;
    }

    .etransfer-recipient-email {
        font-size: 24px;
        font-weight: 700;
        color: #0369a1;
        margin: 15px 0;
        word-break: break-all;
    }

    .etransfer-amount-display {
        font-size: 48px;
        font-weight: 800;
        color: #059669;
        margin: 25px 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .etransfer-reference-code {
        background-color: #f1f5f9;
        border: 2px dashed #64748b;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        font-family: 'Courier New', Monaco, Consolas, 'Liberation Mono', monospace;
        font-size: 16px;
        font-weight: 600;
        color: #475569;
        letter-spacing: 1px;
    }

    .etransfer-qr-code-container {
        margin: 30px 0;
        padding: 20px;
        background-color: #ffffff;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        display: inline-block;
    }

    .etransfer-instruction-list {
        background-color: #fefefe;
        border-left: 4px solid #3b82f6;
        border-radius: 0 8px 8px 0;
        padding: 25px;
        margin: 30px 0;
    }

    .etransfer-instruction-list h3 {
        color: #1e40af;
        font-size: 18px;
        margin-top: 0;
        margin-bottom: 15px;
    }

    .etransfer-instruction-list ol {
        margin: 0;
        padding-left: 20px;
    }

    .etransfer-instruction-list li {
        margin-bottom: 8px;
        color: #374151;
    }

    .etransfer-warning-box {
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
    }

    .etransfer-warning-box .warning-icon {
        color: #d97706;
        font-size: 20px;
        margin-right: 8px;
    }

    .etransfer-warning-text {
        color: #92400e;
        font-weight: 500;
    }

    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
        .etransfer-amount-display {
            font-size: 36px !important;
        }

        .etransfer-recipient-email {
            font-size: 18px !important;
        }
    }
</style>

<div class="etransfer-payment-instructions">
    <h2 style="color: #374151; margin-bottom: 20px;">💸 E-Transfer Payment Instructions</h2>

    <p>To complete your payment, please send an e-Transfer with the following details:</p>

    <!-- Payment Details Card -->
    <div class="etransfer-payment-card">
        <div class="etransfer-payment-title">Send e-Transfer to:</div>

        <div class="etransfer-recipient-email">
            <?php echo esc_html(get_option('etransfer_recipient_email', 'payments@example.com')); ?>
        </div>

        <div class="etransfer-amount-display">
            <?php echo wp_kses_post($order->get_formatted_order_total()); ?>
        </div>

        <div style="margin: 20px 0;">
            <strong>Reference/Message:</strong>
            <div class="etransfer-reference-code">
                Order #<?php echo esc_html($order->get_order_number()); ?>
            </div>
        </div>

        <!-- QR Code Placeholder -->
        <?php if (get_option('etransfer_enable_qr_codes', 0)) : ?>
        <div class="etransfer-qr-code-container">
            <?php
            // Hook for QR code - plugins can replace this
            do_action('etransfer_email_qr_code', $order);
            ?>
        </div>
        <?php endif; ?>
    </div>

    <!-- Instructions -->
    <div class="etransfer-instruction-list">
        <h3>📋 How to send the e-Transfer:</h3>
        <ol>
            <li>Log into your online banking or mobile app</li>
            <li>Navigate to "Send Money" or "Interac e-Transfer"</li>
            <li>Enter the recipient email: <strong><?php echo esc_html(get_option('etransfer_recipient_email', 'payments@example.com')); ?></strong></li>
            <li>Enter the amount: <strong><?php echo wp_kses_post($order->get_formatted_order_total()); ?></strong></li>
            <li>In the message field, include: <strong>Order #<?php echo esc_html($order->get_order_number()); ?></strong></li>
            <li>Send the transfer (no security question needed)</li>
        </ol>
    </div>

    <!-- Custom Instructions -->
    <?php
    $custom_instructions = get_option('etransfer_custom_instructions', '');
    if (!empty($custom_instructions)) : ?>
    <div class="etransfer-instruction-list">
        <h3>📝 Additional Instructions:</h3>
        <p><?php echo wp_kses_post(wpautop($custom_instructions)); ?></p>
    </div>
    <?php endif; ?>

    <!-- Warning Box -->
    <div class="etransfer-warning-box">
        <span class="warning-icon">⚠️</span>
        <span class="etransfer-warning-text">
            <strong>Important:</strong> Please include the order number in your e-Transfer message to ensure quick processing of your order.
        </span>
    </div>

    <p style="margin-top: 30px;">Once we receive your e-Transfer, we'll process your order immediately and send you a confirmation email.</p>
</div>