<?php
/**
 * E-Transfer Payment Gateway Class
 */

if (!defined('ABSPATH')) {
    exit;
}

class ETransfer_Payment_Gateway extends WC_Payment_Gateway {

    /**
     * Constructor
     */
    public function __construct() {
        $this->id                 = 'etransfer';
        $this->icon               = ETRANSFER_WC_PLUGIN_URL . 'assets/images/etransfer-icon.png';
        $this->has_fields         = true;
        $this->method_title       = __('E-Transfer', 'etransfer-woocommerce');
        $this->method_description = __('Accept payments via Interac e-Transfer', 'etransfer-woocommerce');

        $this->supports = array(
            'products',
            'subscriptions',
            'subscription_cancellation',
            'subscription_suspension',
            'subscription_reactivation',
            'subscription_amount_changes',
            'subscription_date_changes',
            'subscription_payment_method_change'
        );

        // Load the settings
        $this->init_form_fields();
        $this->init_settings();

        // Define user set variables
        $this->title              = $this->get_option('title');
        $this->description        = $this->get_option('description');
        $this->instructions       = $this->get_option('instructions');
        $this->enable_for_methods = $this->get_option('enable_for_methods', array());
        $this->enable_for_virtual = $this->get_option('enable_for_virtual', 'yes') === 'yes';
        $this->require_id_verification = $this->get_option('require_id_verification', 'no') === 'yes';

        // Sync QR setting with global option
        $qr_enabled = $this->get_option('enable_qr_codes', 'yes') === 'yes';
        update_option('etransfer_enable_qr_codes', $qr_enabled ? 'yes' : 'no');

        // Actions
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));

        // Customer Emails
        add_action('woocommerce_email_before_order_table', array($this, 'email_instructions'), 10, 3);

        // Admin order meta box
        add_action('add_meta_boxes', array($this, 'add_order_meta_box'));
    }

    /**
     * Initialize Gateway Settings Form Fields
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title'   => __('Enable/Disable', 'etransfer-woocommerce'),
                'type'    => 'checkbox',
                'label'   => __('Enable E-Transfer Payment', 'etransfer-woocommerce'),
                'default' => 'no'
            ),
            'title' => array(
                'title'       => __('Title', 'etransfer-woocommerce'),
                'type'        => 'text',
                'description' => __('This controls the title for the payment method the customer sees during checkout.', 'etransfer-woocommerce'),
                'default'     => __('Interac e-Transfer', 'etransfer-woocommerce'),
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __('Description', 'etransfer-woocommerce'),
                'type'        => 'textarea',
                'description' => __('Payment method description that the customer will see on your checkout.', 'etransfer-woocommerce'),
                'default'     => __('Pay securely using Interac e-Transfer. You will receive payment instructions via email after placing your order.', 'etransfer-woocommerce'),
                'desc_tip'    => true,
            ),
            'instructions' => array(
                'title'       => __('Instructions', 'etransfer-woocommerce'),
                'type'        => 'textarea',
                'description' => __('Instructions that will be added to the thank you page and emails.', 'etransfer-woocommerce'),
                'default'     => __('Please send your e-Transfer to the email address provided. Include your order number in the message field.', 'etransfer-woocommerce'),
                'desc_tip'    => true,
            ),
            'enable_for_methods' => array(
                'title'             => __('Enable for shipping methods', 'etransfer-woocommerce'),
                'type'              => 'multiselect',
                'class'             => 'wc-enhanced-select',
                'css'               => 'width: 400px;',
                'default'           => '',
                'description'       => __('If E-Transfer is only available for certain methods, set it up here. Leave blank to enable for all methods.', 'etransfer-woocommerce'),
                'options'           => $this->load_shipping_method_options(),
                'desc_tip'          => true,
                'custom_attributes' => array(
                    'data-placeholder' => __('Select shipping methods', 'etransfer-woocommerce'),
                ),
            ),
            'enable_for_virtual' => array(
                'title'   => __('Accept for virtual orders', 'etransfer-woocommerce'),
                'label'   => __('Accept E-Transfer if the order is virtual', 'etransfer-woocommerce'),
                'type'    => 'checkbox',
                'default' => 'yes',
            ),
            'require_id_verification' => array(
                'title'   => __('ID Verification', 'etransfer-woocommerce'),
                'label'   => __('Require customers to upload ID for verification', 'etransfer-woocommerce'),
                'type'    => 'checkbox',
                'description' => __('When enabled, customers will be required to upload a government-issued photo ID during checkout.', 'etransfer-woocommerce'),
                'default' => 'no',
                'desc_tip' => true,
            ),
            'enable_qr_codes' => array(
                'title'   => __('QR Codes', 'etransfer-woocommerce'),
                'label'   => __('Enable QR codes for payment instructions', 'etransfer-woocommerce'),
                'type'    => 'checkbox',
                'description' => __('When enabled, customers will see QR codes in emails and thank you page that open their email app with pre-filled payment details.', 'etransfer-woocommerce'),
                'default' => 'yes',
                'desc_tip' => true,
            ),
        );
    }

    /**
     * Check if this gateway is available for the current order
     */
    public function is_available() {
        $order          = null;
        $needs_shipping = false;

        // Test if shipping is needed first
        if (WC()->cart && WC()->cart->needs_shipping()) {
            $needs_shipping = true;
        } elseif (is_admin() && function_exists('wc_get_order') && absint(get_query_var('order-received'))) {
            $order          = wc_get_order(absint(get_query_var('order-received')));
            $needs_shipping = $order && $order->needs_shipping();
        }

        $needs_shipping = apply_filters('woocommerce_cart_needs_shipping', $needs_shipping);

        // Virtual order, with virtual disabled
        if (!$this->enable_for_virtual && !$needs_shipping) {
            return false;
        }

        // Check methods
        if (!empty($this->enable_for_methods) && $needs_shipping) {
            // Only apply if all packages are being shipped via chosen methods, or order is virtual
            $order_shipping_items            = is_object($order) ? $order->get_shipping_methods() : false;
            $chosen_shipping_methods_session = WC()->session->get('chosen_shipping_methods');

            if ($order_shipping_items) {
                $canonical_rate_ids = $this->get_canonical_order_shipping_item_rate_ids($order_shipping_items);
            } else {
                $canonical_rate_ids = $this->get_canonical_package_rate_ids($chosen_shipping_methods_session);
            }

            if (!count($this->get_matching_rates($canonical_rate_ids))) {
                return false;
            }
        }

        return parent::is_available();
    }

    /**
     * Checks to see whether or not the admin settings are being accessed by the current request.
     */
    private function is_accessing_settings() {
        if (is_admin()) {
            // phpcs:disable WordPress.Security.NonceVerification
            if (!isset($_REQUEST['page']) || 'wc-settings' !== $_REQUEST['page']) {
                return false;
            }
            if (!isset($_REQUEST['tab']) || 'checkout' !== $_REQUEST['tab']) {
                return false;
            }
            if (!isset($_REQUEST['section']) || 'etransfer' !== $_REQUEST['section']) {
                return false;
            }
            // phpcs:enable WordPress.Security.NonceVerification

            return true;
        }

        return false;
    }

    /**
     * Loads all of the shipping method options for the enable_for_methods field.
     */
    private function load_shipping_method_options() {
        // Since this is expensive, we only want to do it if we're actually on the settings page.
        if (!$this->is_accessing_settings()) {
            return array();
        }

        $data_store = WC_Data_Store::load('shipping-zone');
        $raw_zones  = $data_store->get_zones();

        foreach ($raw_zones as $raw_zone) {
            $zones[] = new WC_Shipping_Zone($raw_zone);
        }

        $zones[] = new WC_Shipping_Zone(0);

        $options = array();
        foreach (WC()->shipping()->load_shipping_methods() as $method) {

            $options[$method->get_method_title()] = array();

            // Translators: %1$s shipping method name
            $options[$method->get_method_title()][$method->id] = sprintf(__('Any &quot;%1$s&quot; method', 'etransfer-woocommerce'), $method->get_method_title());

            foreach ($zones as $zone) {

                $shipping_method_instances = $zone->get_shipping_methods();

                foreach ($shipping_method_instances as $shipping_method_instance_id => $shipping_method_instance) {

                    if ($shipping_method_instance->id !== $method->id) {
                        continue;
                    }

                    $option_id = $shipping_method_instance->get_rate_id();

                    // Translators: %1$s shipping method title, %2$s shipping method id
                    $option_instance_title = sprintf(__('%1$s (#%2$s)', 'etransfer-woocommerce'), $shipping_method_instance->get_title(), $shipping_method_instance_id);

                    // Translators: %1$s zone name, %2$s shipping method instance name
                    $option_title = sprintf(__('%1$s &ndash; %2$s', 'etransfer-woocommerce'), $zone->get_id() ? $zone->get_zone_name() : __('Other locations', 'etransfer-woocommerce'), $option_instance_title);

                    $options[$method->get_method_title()][$option_id] = $option_title;
                }
            }
        }

        return $options;
    }

    /**
     * Converts the chosen rate IDs generated by Shipping Methods to a canonical 'method_id:instance_id' format.
     */
    private function get_canonical_order_shipping_item_rate_ids($order_shipping_items) {
        $canonical_rate_ids = array();

        foreach ($order_shipping_items as $order_shipping_item) {
            $canonical_rate_ids[] = $order_shipping_item->get_method_id() . ':' . $order_shipping_item->get_instance_id();
        }

        return $canonical_rate_ids;
    }

    /**
     * Converts the chosen rate IDs generated by Shipping Methods to a canonical 'method_id:instance_id' format.
     */
    private function get_canonical_package_rate_ids($chosen_package_rate_ids) {
        $canonical_rate_ids = array();

        if (!empty($chosen_package_rate_ids) && is_array($chosen_package_rate_ids)) {
            foreach ($chosen_package_rate_ids as $chosen_package_rate_id) {
                if (!empty($chosen_package_rate_id)) {
                    $canonical_rate_ids[] = $chosen_package_rate_id;
                }
            }
        }

        return $canonical_rate_ids;
    }

    /**
     * Indicates whether a rate exists in an array of canonically-formatted rate IDs that activates this gateway.
     */
    private function get_matching_rates($rate_ids) {
        // First, match entries in 'method_id:instance_id' format. Then, match entries in 'method_id' format by stripping off the instance ID from the candidates.
        return array_unique(array_merge(array_intersect($this->enable_for_methods, $rate_ids), array_intersect($this->enable_for_methods, array_unique(array_map('wc_get_string_before_colon', $rate_ids)))));
    }

    /**
     * Process the payment and return the result
     */
    public function process_payment($order_id) {
        error_log('E-Transfer: process_payment called for order ID: ' . $order_id);
        $order = wc_get_order($order_id);

        if (!$order) {
            wc_add_notice(__('Order not found.', 'etransfer-woocommerce'), 'error');
            return array(
                'result'   => 'fail',
                'redirect' => ''
            );
        }

        // Get payer handle from POST data
        $payer_handle = isset($_POST['etransfer_payer_handle']) ? sanitize_email($_POST['etransfer_payer_handle']) : '';

        if (empty($payer_handle)) {
            wc_add_notice(__('Please provide your email address for the e-Transfer.', 'etransfer-woocommerce'), 'error');
            return array(
                'result'   => 'fail',
                'redirect' => ''
            );
        }

        // Validate email format
        if (!is_email($payer_handle)) {
            wc_add_notice(__('Please provide a valid email address for the e-Transfer.', 'etransfer-woocommerce'), 'error');
            return array(
                'result'   => 'fail',
                'redirect' => ''
            );
        }

        // Handle ID upload if required
        $id_upload_path = '';
        if ($this->require_id_verification && !empty($_FILES['etransfer_id_upload']['name'])) {
            $id_upload_path = $this->handle_id_upload($order_id);
            if (is_wp_error($id_upload_path)) {
                wc_add_notice($id_upload_path->get_error_message(), 'error');
                return array(
                    'result'   => 'fail',
                    'redirect' => ''
                );
            }
        }

        // Store payer handle and ID upload path in order meta
        $order->update_meta_data('_etransfer_payer_handle', $payer_handle);
        if (!empty($id_upload_path)) {
            $order->update_meta_data('_etransfer_id_upload_path', $id_upload_path);
        }

        // Send order data to backend API (optional - don't fail payment if API is down)
        $api_endpoint = get_option('etransfer_backend_api_endpoint', 'http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders');
        $api_success = false;

        error_log('E-Transfer: Starting API call to: ' . $api_endpoint);
        error_log('E-Transfer: API endpoint is empty: ' . (empty($api_endpoint) ? 'YES' : 'NO'));

        if (!empty($api_endpoint)) {
            error_log('E-Transfer: API endpoint is not empty, proceeding with API call...');
            // Get bank account ID by looking up the recipient email
            $recipient_email = get_option('etransfer_recipient_email', get_option('admin_email'));
            $bank_account_id = $this->get_bank_account_id_by_email($recipient_email);
            
            if (!$bank_account_id) {
                error_log('E-Transfer: Could not find bank account for email: ' . $recipient_email);
                $order->add_order_note(__('E-Transfer: Could not find bank account for recipient email. Using fallback bank account ID 1.', 'etransfer-woocommerce'));
                $bank_account_id = 1; // Fallback to default
            } else {
                error_log('E-Transfer: Found bank account ID: ' . $bank_account_id . ' for email: ' . $recipient_email);
            }

            // Format data according to the API specification
            $order_data = array(
                'woo_order_id'     => $order_id,
                'status'           => 'pending',
                'total'            => intval($order->get_total() * 100), // Convert to cents
                'customer_name'    => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'customer_email'   => $payer_handle,
                'description'      => 'WooCommerce Order #' . $order->get_order_number(),
                'ip_address'       => $order->get_customer_ip_address(),
                'bank_account_id'  => $bank_account_id
            );

            // Log the API request for debugging
            error_log('E-Transfer API Request: ' . json_encode($order_data));
            error_log('E-Transfer: Making API call to: ' . $api_endpoint);

            $response = wp_remote_post($api_endpoint, array(
                'method'    => 'POST',
                'body'      => json_encode($order_data),
                'headers'   => array(
                    'Content-Type' => 'application/json',
                ),
                'timeout'   => 10, // Reduced timeout
            ));

            error_log('E-Transfer: API call completed, checking response...');

            if (is_wp_error($response)) {
                error_log('E-Transfer API Error: ' . $response->get_error_message());
                $order->add_order_note(__('E-Transfer API Error: ' . $response->get_error_message(), 'etransfer-woocommerce'));
            } else {
                $response_code = wp_remote_retrieve_response_code($response);
                $response_body = wp_remote_retrieve_body($response);

                // Log the API response for debugging
                error_log('E-Transfer API Response: HTTP ' . $response_code . ' - ' . $response_body);
                $order->add_order_note(sprintf(
                    __('E-Transfer API Response: Code %d, Body: %s', 'etransfer-woocommerce'),
                    $response_code,
                    $response_body
                ));

                // Check for successful response (200 or 201)
                if ($response_code === 200 || $response_code === 201) {
                    $api_success = true;
                    
                    // Parse response to get backend order ID if available
                    $response_data = json_decode($response_body, true);
                    if (isset($response_data['data']['id'])) {
                        $order->update_meta_data('_etransfer_backend_order_id', $response_data['data']['id']);
                    }
                } else {
                    error_log('E-Transfer API Error: HTTP ' . $response_code . ' - ' . $response_body);
                    $order->add_order_note(__('E-Transfer API Error: HTTP ' . $response_code . ' - ' . $response_body, 'etransfer-woocommerce'));
                }
            }
        } else {
            error_log('E-Transfer: API endpoint is empty, skipping API call');
            $order->add_order_note(__('E-Transfer: API endpoint not configured, skipping backend API call.', 'etransfer-woocommerce'));
        }

        // Add note about API status
        if ($api_success) {
            $order->add_order_note(__('E-Transfer order successfully sent to backend API.', 'etransfer-woocommerce'));
        } else {
            $order->add_order_note(__('E-Transfer order created locally. Backend API not available.', 'etransfer-woocommerce'));
        }

        // Mark as pending payment
        $order->update_status('pending', __('Awaiting e-Transfer payment.', 'etransfer-woocommerce'));

        // Reduce stock levels
        wc_reduce_stock_levels($order_id);

        // Remove cart
        WC()->cart->empty_cart();

        // Add order note
        $order->add_order_note(sprintf(
            __('E-Transfer payment initiated. Payer email: %s', 'etransfer-woocommerce'),
            $payer_handle
        ));

        $order->save();

        // Return thankyou redirect
        return array(
            'result'   => 'success',
            'redirect' => $this->get_return_url($order)
        );
    }

    /**
     * Output for the order received page.
     */
    public function thankyou_page($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order || $order->get_payment_method() !== $this->id) {
            return;
        }

        $payer_handle = $order->get_meta('_etransfer_payer_handle');
        $recipient_email = get_option('etransfer_recipient_email', get_option('admin_email'));
        
        echo '<div class="etransfer-payment-instructions" style="background: #f8f9fa; border: 2px solid #007cba; border-radius: 8px; padding: 20px; margin: 20px 0;">';
        echo '<h3 style="color: #007cba; margin-top: 0;">💸 Complete Your e-Transfer Payment</h3>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
        echo '<p><strong>📧 Send e-Transfer to:</strong></p>';
        echo '<div style="background: #e3f2fd; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold; color: #1976d2;">';
        echo esc_html($recipient_email);
        echo '</div>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
        echo '<p><strong>💰 Amount to send:</strong></p>';
        echo '<div style="background: #e8f5e8; padding: 10px; border-radius: 4px; font-size: 24px; font-weight: bold; color: #2e7d32;">';
        echo wp_kses_post($order->get_formatted_order_total());
        echo '</div>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
        echo '<p><strong>📝 Reference/Message:</strong></p>';
        echo '<div style="background: #fff3e0; padding: 10px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #f57c00;">';
        echo 'Order #' . esc_html($order->get_order_number());
        echo '</div>';
        echo '</div>';
        
        echo '<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 15px 0;">';
        echo '<h4 style="color: #856404; margin-top: 0;">⚠️ Important Instructions:</h4>';
        echo '<ol style="color: #856404;">';
        echo '<li>Log into your online banking or mobile banking app</li>';
        echo '<li>Navigate to "Send Money" or "Interac e-Transfer"</li>';
        echo '<li>Enter the recipient email address shown above</li>';
        echo '<li>Enter the exact amount shown above</li>';
        echo '<li>In the message field, include: <strong>Order #' . esc_html($order->get_order_number()) . '</strong></li>';
        echo '<li>Send the transfer (no security question needed)</li>';
        echo '</ol>';
        echo '</div>';
        
        echo '<div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 15px 0;">';
        echo '<p style="color: #0c5460; margin: 0;"><strong>📧 Email Confirmation:</strong> We\'ve sent detailed payment instructions to <strong>' . esc_html($payer_handle) . '</strong></p>';
        echo '</div>';
        
        if ($this->instructions) {
            echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
            echo '<h4>Additional Instructions:</h4>';
            echo wp_kses_post(wpautop(wptexturize($this->instructions)));
            echo '</div>';
        }
        
        echo '</div>';
    }

    /**
     * Add content to the WC emails.
     */
    public function email_instructions($order, $sent_to_admin, $plain_text = false) {
        if (!$sent_to_admin && $this->id === $order->get_payment_method()) {
            $payer_handle = $order->get_meta('_etransfer_payer_handle');
            $recipient_email = get_option('etransfer_recipient_email', get_option('admin_email'));
            
            if ($plain_text) {
                echo "\n" . __('E-TRANSFER PAYMENT INSTRUCTIONS', 'etransfer-woocommerce') . "\n";
                echo str_repeat('=', 50) . "\n\n";
                echo __('Send e-Transfer to:', 'etransfer-woocommerce') . ' ' . $recipient_email . "\n";
                echo __('Amount:', 'etransfer-woocommerce') . ' ' . $order->get_formatted_order_total() . "\n";
                echo __('Reference:', 'etransfer-woocommerce') . ' Order #' . $order->get_order_number() . "\n\n";
                echo __('Instructions:', 'etransfer-woocommerce') . "\n";
                echo "1. " . __('Log into your online banking or mobile app', 'etransfer-woocommerce') . "\n";
                echo "2. " . __('Navigate to "Send Money" or "Interac e-Transfer"', 'etransfer-woocommerce') . "\n";
                echo "3. " . __('Enter recipient email and amount', 'etransfer-woocommerce') . "\n";
                echo "4. " . __('Include order number in message field', 'etransfer-woocommerce') . "\n";
                echo "5. " . __('Send the transfer', 'etransfer-woocommerce') . "\n\n";
                
                if ($this->instructions) {
                    echo $this->instructions . "\n";
                }
            } else {
                echo '<div style="background: #f8f9fa; border: 2px solid #007cba; border-radius: 8px; padding: 20px; margin: 20px 0;">';
                echo '<h3 style="color: #007cba; margin-top: 0;">💸 E-Transfer Payment Instructions</h3>';
                
                echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
                echo '<p><strong>📧 Send e-Transfer to:</strong></p>';
                echo '<div style="background: #e3f2fd; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold; color: #1976d2;">';
                echo esc_html($recipient_email);
                echo '</div>';
                echo '</div>';
                
                echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
                echo '<p><strong>💰 Amount to send:</strong></p>';
                echo '<div style="background: #e8f5e8; padding: 10px; border-radius: 4px; font-size: 24px; font-weight: bold; color: #2e7d32;">';
                echo wp_kses_post($order->get_formatted_order_total());
                echo '</div>';
                echo '</div>';
                
                echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
                echo '<p><strong>📝 Reference/Message:</strong></p>';
                echo '<div style="background: #fff3e0; padding: 10px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #f57c00;">';
                echo 'Order #' . esc_html($order->get_order_number());
                echo '</div>';
                echo '</div>';
                
                echo '<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 15px 0;">';
                echo '<h4 style="color: #856404; margin-top: 0;">⚠️ How to send the e-Transfer:</h4>';
                echo '<ol style="color: #856404;">';
                echo '<li>' . __('Log into your online banking or mobile banking app', 'etransfer-woocommerce') . '</li>';
                echo '<li>' . __('Navigate to "Send Money" or "Interac e-Transfer"', 'etransfer-woocommerce') . '</li>';
                echo '<li>' . __('Enter the recipient email address shown above', 'etransfer-woocommerce') . '</li>';
                echo '<li>' . __('Enter the exact amount shown above', 'etransfer-woocommerce') . '</li>';
                echo '<li>' . sprintf(__('In the message field, include: <strong>Order #%s</strong>', 'etransfer-woocommerce'), esc_html($order->get_order_number())) . '</li>';
                echo '<li>' . __('Send the transfer (no security question needed)', 'etransfer-woocommerce') . '</li>';
                echo '</ol>';
                echo '</div>';
                
                if ($this->instructions) {
                    echo '<div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">';
                    echo '<h4>Additional Instructions:</h4>';
                    echo wp_kses_post(wpautop(wptexturize($this->instructions)));
                    echo '</div>';
                }
                
                echo '</div>';
            }
        }
    }

    /**
     * Payment fields on checkout page
     */
    public function payment_fields() {
        if ($this->description) {
            echo '<p>' . wp_kses_post($this->description) . '</p>';
        }

        echo '<fieldset id="wc-' . esc_attr($this->id) . '-form" class="wc-payment-form" style="background:transparent;">';

        echo '<div class="form-row form-row-wide etransfer-payer-handle">';
        echo '<label for="etransfer_payer_handle">' . __('Your Email Address', 'etransfer-woocommerce') . ' <span class="required">*</span></label>';
        echo '<input id="etransfer_payer_handle" name="etransfer_payer_handle" type="email" class="input-text etransfer-payer-handle" placeholder="' . esc_attr__('Enter your email address', 'etransfer-woocommerce') . '" required />';
        echo '<small class="description">' . __('This is the email address you will use to send the e-Transfer from.', 'etransfer-woocommerce') . '</small>';
        echo '</div>';

        // Add ID verification upload field if enabled
        if ($this->require_id_verification) {
            echo '<div class="form-row form-row-wide etransfer-id-upload">';
            $required_text = $this->require_id_verification ? __('(required)', 'etransfer-woocommerce') : __('(optional)', 'etransfer-woocommerce');
            echo '<label for="etransfer_id_upload">' . __('Upload ID for verification', 'etransfer-woocommerce') . ' ' . $required_text . ' <span class="required">*</span></label>';
            echo '<input id="etransfer_id_upload" name="etransfer_id_upload" type="file" class="input-file etransfer-id-upload" accept="image/jpeg,image/png,application/pdf" />';
            echo '<small class="description">' . __('Please upload a clear photo of your government-issued photo ID. Accepted formats: JPG, PNG, PDF. Maximum file size: 5MB.', 'etransfer-woocommerce') . '</small>';
            echo '</div>';

            // Add nonce field for security
            wp_nonce_field('etransfer_id_upload_nonce', 'etransfer_id_upload_nonce_field');
        }

        echo '<div class="clear"></div></fieldset>';
    }

    /**
     * Validate payment fields on the frontend.
     */
    public function validate_fields() {
        if (empty($_POST['etransfer_payer_handle'])) {
            wc_add_notice(__('Email address is required for e-Transfer payment.', 'etransfer-woocommerce'), 'error');
            return false;
        }

        if (!is_email($_POST['etransfer_payer_handle'])) {
            wc_add_notice(__('Please enter a valid email address.', 'etransfer-woocommerce'), 'error');
            return false;
        }

        // Validate ID upload if required
        if ($this->require_id_verification) {
            // Verify nonce
            if (!isset($_POST['etransfer_id_upload_nonce_field']) || !wp_verify_nonce($_POST['etransfer_id_upload_nonce_field'], 'etransfer_id_upload_nonce')) {
                wc_add_notice(__('Security verification failed. Please try again.', 'etransfer-woocommerce'), 'error');
                return false;
            }

            // Check if file was uploaded
            if (empty($_FILES['etransfer_id_upload']['name'])) {
                wc_add_notice(__('ID verification document is required.', 'etransfer-woocommerce'), 'error');
                return false;
            }

            // Validate file type
            $allowed_types = array('image/jpeg', 'image/png', 'application/pdf');
            $file_type = $_FILES['etransfer_id_upload']['type'];
            if (!in_array($file_type, $allowed_types)) {
                wc_add_notice(__('Invalid file type. Please upload a JPG, PNG, or PDF file.', 'etransfer-woocommerce'), 'error');
                return false;
            }

            // Validate file size (5MB max)
            $max_size = 5 * 1024 * 1024; // 5MB in bytes
            if ($_FILES['etransfer_id_upload']['size'] > $max_size) {
                wc_add_notice(__('File size too large. Maximum file size is 5MB.', 'etransfer-woocommerce'), 'error');
                return false;
            }

            // Check for upload errors
            if ($_FILES['etransfer_id_upload']['error'] !== UPLOAD_ERR_OK) {
                wc_add_notice(__('File upload error. Please try again.', 'etransfer-woocommerce'), 'error');
                return false;
            }
        }

        return true;
    }

    /**
     * Handle ID file upload with security measures
     */
    private function handle_id_upload($order_id) {
        // Verify file was uploaded
        if (empty($_FILES['etransfer_id_upload']['name'])) {
            return new WP_Error('no_file', __('No file uploaded.', 'etransfer-woocommerce'));
        }

        $file = $_FILES['etransfer_id_upload'];

        // Additional security checks
        $allowed_mime_types = array(
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'application/pdf' => 'pdf'
        );

        // Get file info
        $file_info = wp_check_filetype_and_ext($file['tmp_name'], $file['name'], $allowed_mime_types);

        if (!$file_info['type'] || !$file_info['ext']) {
            return new WP_Error('invalid_file_type', __('Invalid file type. Please upload a JPG, PNG, or PDF file.', 'etransfer-woocommerce'));
        }

        // Sanitize filename and prevent directory traversal
        $filename = sanitize_file_name($file['name']);
        $filename = wp_unique_filename(wp_upload_dir()['path'], $filename);

        // Create upload directory structure
        $upload_dir = wp_upload_dir();
        $etransfer_dir = $upload_dir['basedir'] . '/etransfer-id-verification';
        $order_dir = $etransfer_dir . '/' . intval($order_id);

        // Create directories if they don't exist
        if (!file_exists($etransfer_dir)) {
            wp_mkdir_p($etransfer_dir);
            // Add .htaccess to prevent direct access
            $htaccess_content = "Options -Indexes\n<Files *>\nOrder Allow,Deny\nDeny from all\n</Files>";
            file_put_contents($etransfer_dir . '/.htaccess', $htaccess_content);
        }

        if (!file_exists($order_dir)) {
            wp_mkdir_p($order_dir);
        }

        // Set up upload overrides
        $upload_overrides = array(
            'test_form' => false,
            'test_size' => true,
            'test_upload' => true,
        );

        // Prepare file array for wp_handle_upload
        $file_array = array(
            'name'     => $filename,
            'type'     => $file_info['type'],
            'tmp_name' => $file['tmp_name'],
            'error'    => $file['error'],
            'size'     => $file['size']
        );

        // Use WordPress file handling
        add_filter('upload_dir', array($this, 'set_upload_dir'));
        $this->current_order_id = $order_id;

        $uploaded_file = wp_handle_upload($file_array, $upload_overrides);

        remove_filter('upload_dir', array($this, 'set_upload_dir'));
        unset($this->current_order_id);

        if (isset($uploaded_file['error'])) {
            return new WP_Error('upload_error', $uploaded_file['error']);
        }

        return $uploaded_file['file'];
    }

    /**
     * Add order meta box for ID verification
     */
    public function add_order_meta_box() {
        global $post;

        if (!$post || $post->post_type !== 'shop_order') {
            return;
        }

        $order = wc_get_order($post->ID);
        if (!$order || $order->get_payment_method() !== $this->id) {
            return;
        }

        $id_upload_path = $order->get_meta('_etransfer_id_upload_path');
        if (!empty($id_upload_path)) {
            add_meta_box(
                'etransfer_id_verification',
                __('E-Transfer ID Verification', 'etransfer-woocommerce'),
                array($this, 'order_meta_box_content'),
                'shop_order',
                'side',
                'default'
            );
        }
    }

    /**
     * Display order meta box content
     */
    public function order_meta_box_content($post) {
        $order = wc_get_order($post->ID);
        $id_upload_path = $order->get_meta('_etransfer_id_upload_path');

        if (empty($id_upload_path)) {
            echo '<p>' . __('No ID verification document uploaded.', 'etransfer-woocommerce') . '</p>';
            return;
        }

        $filename = basename($id_upload_path);
        $file_extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        echo '<div class="etransfer-id-verification">';
        echo '<p><strong>' . __('ID Document:', 'etransfer-woocommerce') . '</strong></p>';

        // Create download link with nonce
        $download_url = wp_nonce_url(
            admin_url('admin-ajax.php?action=etransfer_download_id&order_id=' . $post->ID),
            'etransfer_download_id_' . $post->ID
        );

        echo '<p>';
        echo '<a href="' . esc_url($download_url) . '" class="button button-secondary" target="_blank">';
        echo '<span class="dashicons dashicons-download"></span> ';
        echo __('Download ID Document', 'etransfer-woocommerce');
        echo '</a>';
        echo '</p>';

        echo '<p><small>' . sprintf(__('Filename: %s', 'etransfer-woocommerce'), esc_html($filename)) . '</small></p>';

        // Show file type icon
        $icon_class = 'dashicons-media-default';
        if (in_array($file_extension, array('jpg', 'jpeg', 'png'))) {
            $icon_class = 'dashicons-format-image';
        } elseif ($file_extension === 'pdf') {
            $icon_class = 'dashicons-pdf';
        }

        echo '<p><span class="dashicons ' . $icon_class . '"></span> ';
        echo strtoupper($file_extension) . ' ' . __('file', 'etransfer-woocommerce') . '</p>';
        echo '</div>';

        // Add AJAX handler hook if not already added
        if (!has_action('wp_ajax_etransfer_download_id')) {
            add_action('wp_ajax_etransfer_download_id', array($this, 'handle_id_download'));
        }
    }

    /**
     * Handle ID document download
     */
    public function handle_id_download() {
        // Verify nonce
        $order_id = intval($_GET['order_id']);
        if (!wp_verify_nonce($_GET['_wpnonce'], 'etransfer_download_id_' . $order_id)) {
            wp_die(__('Security check failed.', 'etransfer-woocommerce'));
        }

        // Check user capabilities
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('You do not have permission to access this file.', 'etransfer-woocommerce'));
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            wp_die(__('Order not found.', 'etransfer-woocommerce'));
        }

        $id_upload_path = $order->get_meta('_etransfer_id_upload_path');
        if (empty($id_upload_path) || !file_exists($id_upload_path)) {
            wp_die(__('File not found.', 'etransfer-woocommerce'));
        }

        // Get file info
        $filename = basename($id_upload_path);
        $mime_type = wp_check_filetype($filename);

        // Set headers for download
        header('Content-Type: ' . $mime_type['type']);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($id_upload_path));
        header('Cache-Control: private');

        // Output file
        readfile($id_upload_path);
        exit;
    }

    /**
     * Set custom upload directory for ID files
     */
    public function set_upload_dir($upload) {
        if (isset($this->current_order_id)) {
            $upload['subdir'] = '/etransfer-id-verification/' . intval($this->current_order_id);
            $upload['path'] = $upload['basedir'] . $upload['subdir'];
            $upload['url'] = $upload['baseurl'] . $upload['subdir'];
        }
        return $upload;
    }

    /**
     * Get bank account ID by email from backend API
     */
    private function get_bank_account_id_by_email($email) {
        $api_base_url = get_option('etransfer_backend_api_endpoint', 'http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders');
        $api_base_url = str_replace('/api/orders', '', $api_base_url);
        $lookup_endpoint = $api_base_url . '/api/bank-account-by-email?email=' . urlencode($email);

        error_log('E-Transfer: Looking up bank account for email: ' . $email);
        error_log('E-Transfer: API endpoint: ' . $lookup_endpoint);

        $response = wp_remote_get($lookup_endpoint, array(
            'timeout' => 10,
            'headers' => array(
                'User-Agent' => 'WordPress-eTransfer-Plugin/1.0'
            )
        ));

        if (is_wp_error($response)) {
            error_log('E-Transfer: Failed to get bank account: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        error_log('E-Transfer: Bank account lookup response - Code: ' . $response_code . ', Body: ' . $response_body);

        if ($response_code !== 200) {
            error_log('E-Transfer: Bank account lookup returned HTTP ' . $response_code . ': ' . $response_body);
            return false;
        }

        $data = json_decode($response_body, true);
        
        if (!$data || !isset($data['data']) || !isset($data['data']['id'])) {
            error_log('E-Transfer: Invalid response from bank account lookup. Data structure: ' . print_r($data, true));
            return false;
        }

        $bank_account_id = $data['data']['id'];
        error_log('E-Transfer: Found bank account - ID: ' . $bank_account_id . ' for email: ' . $email);
        return $bank_account_id;
    }
}