<?php
/**
 * Plugin Name: E-Transfer WooCommerce Integration
 * Plugin URI: https://example.com
 * Description: Modern e-Transfer payment integration for WooCommerce with custom email templates and enhanced checkout styling.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: etransfer-woocommerce
 * Domain Path: /languages
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ETRANSFER_WC_VERSION', '1.0.0');
define('ETRANSFER_WC_PLUGIN_FILE', __FILE__);
define('ETRANSFER_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ETRANSFER_WC_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class ETransfer_WooCommerce {

    /**
     * Plugin instance
     */
    private static $instance = null;

    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        // Check if WooCommerce is active
        if (in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
            $this->includes();
            $this->init_hooks();
        } else {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
        }
    }

    /**
     * Initialize the plugin
     */
    public function init() {
        // Initialize plugin features
        $this->load_template_overrides();
    }

    /**
     * Load plugin textdomain
     */
    public function load_textdomain() {
        load_plugin_textdomain('etransfer-woocommerce', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Include required files
     */
    private function includes() {
        // Include the payment gateway class
        require_once ETRANSFER_WC_PLUGIN_DIR . 'includes/class-etransfer-payment-gateway.php';
        // Include the QR code generator
        require_once ETRANSFER_WC_PLUGIN_DIR . 'includes/class-etransfer-qr-generator.php';
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Email template overrides
        add_filter('woocommerce_locate_template', array($this, 'locate_custom_email_template'), 10, 3);
        add_action('woocommerce_email_before_order_table', array($this, 'add_payment_instructions_to_email'), 10, 4);

        // Enqueue styles and scripts
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // Checkout form enhancements
        add_action('wp_footer', array($this, 'add_checkout_styling'));
        add_filter('woocommerce_form_field', array($this, 'enhance_form_fields'), 10, 4);

        // Add plugin settings
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // QR Code hooks
        add_action('etransfer_email_qr_code', array($this, 'display_qr_code'), 10, 1);
        add_action('woocommerce_thankyou', array($this, 'add_qr_to_thankyou_page'), 15, 1);
        add_action('etransfer_cleanup_qr_files', array($this, 'cleanup_qr_files'));

        // Add payment gateway
        add_filter('woocommerce_payment_gateways', array($this, 'add_etransfer_gateway'));

        // Add email template to WooCommerce email settings (for admin visibility)
        add_action('woocommerce_email_settings_after', array($this, 'add_email_template_setting'));

        // Ensure our payment method hooks into the correct emails
        add_action('woocommerce_email_order_meta', array($this, 'add_etransfer_meta_to_emails'), 5, 4);

        // Add AJAX handler for API test
        add_action('wp_ajax_test_etransfer_api', array($this, 'test_api_connection'));
    }

    /**
     * Override WooCommerce email templates with custom ones
     */
    public function locate_custom_email_template($template, $template_name, $template_path) {
        // Log template lookup for debugging
        error_log('E-Transfer: Looking for template: ' . $template_name . ' in path: ' . $template_path);

        // Check if this is an email template we want to override
        if (strpos($template_name, 'emails/') === 0) {
            // First try the WooCommerce standard path structure
            $woocommerce_template = ETRANSFER_WC_PLUGIN_DIR . 'woocommerce/' . $template_name;

            if (file_exists($woocommerce_template)) {
                error_log('E-Transfer: Using WooCommerce template override: ' . $woocommerce_template);
                return $woocommerce_template;
            }

            // Fallback to our custom templates path
            $custom_template = ETRANSFER_WC_PLUGIN_DIR . 'templates/' . $template_name;

            if (file_exists($custom_template)) {
                error_log('E-Transfer: Using custom template: ' . $custom_template);
                return $custom_template;
            }
        }

        return $template;
    }

    /**
     * Add payment instructions to specific emails
     */
    public function add_payment_instructions_to_email($order, $sent_to_admin, $plain_text, $email) {
        // Only add to customer emails for pending payment orders
        if (!$sent_to_admin && $order->get_status() === 'pending' && $email->id === 'customer_on_hold_order') {
            // The custom template will handle the display
        }
    }

    /**
     * Load template overrides
     */
    private function load_template_overrides() {
        // Register our custom email template
        add_filter('woocommerce_email_classes', array($this, 'add_custom_email_class'));
    }

    /**
     * Add custom email class (if needed for advanced customization)
     */
    public function add_custom_email_class($email_classes) {
        // Custom email class can be added here if needed
        return $email_classes;
    }

    /**
     * Add E-Transfer email template setting to WooCommerce email settings
     */
    public function add_email_template_setting() {
        ?>
        <tr valign="top">
            <th scope="row" class="titledesc">
                <label for="etransfer_email_enabled"><?php _e('E-Transfer Email Template', 'etransfer-woocommerce'); ?></label>
            </th>
            <td class="forminp">
                <fieldset>
                    <legend class="screen-reader-text"><span><?php _e('E-Transfer Email Template', 'etransfer-woocommerce'); ?></span></legend>
                    <input class="input-text regular-input" type="text" readonly="readonly" value="<?php echo esc_attr(ETRANSFER_WC_PLUGIN_DIR . 'woocommerce/emails/customer-on-hold-order.php'); ?>" />
                    <p class="description"><?php _e('Custom e-Transfer email template is active for on-hold orders using e-Transfer payment method.', 'etransfer-woocommerce'); ?></p>
                </fieldset>
            </td>
        </tr>
        <?php
    }

    /**
     * Add E-Transfer specific meta to emails when using our payment method
     */
    public function add_etransfer_meta_to_emails($order, $sent_to_admin, $plain_text, $email) {
        // Only add to customer emails for e-Transfer orders
        if (!$sent_to_admin && $order instanceof WC_Order && $order->get_payment_method() === 'etransfer') {
            error_log('E-Transfer: Adding meta to email for order #' . $order->get_order_number() . ', email ID: ' . $email->id);

            // Add debug info about the email context
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- E-Transfer email context: ' . esc_html($email->id) . ' -->';
            }
        }
    }

    /**
     * Enqueue frontend assets
     */
    public function enqueue_frontend_assets() {
        if (is_checkout() || is_account_page()) {
            wp_enqueue_style(
                'etransfer-wc-frontend',
                ETRANSFER_WC_PLUGIN_URL . 'assets/css/frontend.css',
                array(),
                ETRANSFER_WC_VERSION
            );

            wp_enqueue_script(
                'etransfer-wc-frontend',
                ETRANSFER_WC_PLUGIN_URL . 'assets/js/frontend.js',
                array('jquery'),
                ETRANSFER_WC_VERSION,
                true
            );
        }
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'etransfer-settings') !== false) {
            wp_enqueue_style(
                'etransfer-wc-admin',
                ETRANSFER_WC_PLUGIN_URL . 'assets/css/admin.css',
                array(),
                ETRANSFER_WC_VERSION
            );
        }
    }

    /**
     * Add enhanced checkout styling
     */
    public function add_checkout_styling() {
        if (is_checkout()) {
            ?>
            <style type="text/css">
                /* Enhanced Checkout Form Styling */
                .woocommerce-checkout .form-row {
                    margin-bottom: 1.5rem;
                }

                .woocommerce-checkout .form-row label {
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 0.5rem;
                    display: block;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .woocommerce-checkout .form-row label .required {
                    color: #ef4444;
                    margin-left: 4px;
                }

                /* Enhanced input styling */
                .woocommerce-checkout .input-text,
                .woocommerce-checkout select,
                .woocommerce-checkout textarea {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e5e7eb;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    line-height: 1.5;
                    color: #111827;
                    background-color: #ffffff;
                    transition: all 0.15s ease-in-out;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }

                .woocommerce-checkout .input-text:focus,
                .woocommerce-checkout select:focus,
                .woocommerce-checkout textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    background-color: #fefefe;
                }

                .woocommerce-checkout .input-text:invalid,
                .woocommerce-checkout select:invalid,
                .woocommerce-checkout textarea:invalid {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                /* Payer handle specific styling */
                .woocommerce-checkout .form-row.etransfer-payer-handle {
                    position: relative;
                }

                .woocommerce-checkout .form-row.etransfer-payer-handle label::after {
                    content: " (Your email used for e-Transfer)";
                    font-weight: 400;
                    color: #6b7280;
                    text-transform: none;
                    letter-spacing: normal;
                }

                .woocommerce-checkout .form-row.etransfer-payer-handle .input-text {
                    padding-left: 3rem;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: 0.75rem center;
                    background-size: 1.25rem;
                }

                /* Validation messages */
                .woocommerce-checkout .woocommerce-error,
                .woocommerce-checkout .woocommerce-message,
                .woocommerce-checkout .woocommerce-info {
                    padding: 1rem 1.25rem;
                    margin-bottom: 1.5rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid;
                    background-color: #f9fafb;
                    font-weight: 500;
                }

                .woocommerce-checkout .woocommerce-error {
                    border-left-color: #ef4444;
                    background-color: #fef2f2;
                    color: #991b1b;
                }

                .woocommerce-checkout .woocommerce-message {
                    border-left-color: #10b981;
                    background-color: #f0fdf4;
                    color: #065f46;
                }

                .woocommerce-checkout .woocommerce-info {
                    border-left-color: #3b82f6;
                    background-color: #eff6ff;
                    color: #1e40af;
                }

                /* Field validation styling */
                .woocommerce-checkout .form-row.etransfer-invalid .input-text {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .woocommerce-checkout .form-row.etransfer-validated .input-text {
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }

                /* Place order button enhancement */
                .woocommerce-checkout #place_order {
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    color: white;
                    padding: 1rem 2rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 1.125rem;
                    font-weight: 600;
                    transition: all 0.15s ease-in-out;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    width: 100%;
                }

                .woocommerce-checkout #place_order:hover {
                    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
                    box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15);
                    transform: translateY(-1px);
                }

                .woocommerce-checkout #place_order:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                }

                /* Payment method styling */
                .woocommerce-checkout .payment_methods {
                    background: #f8fafc;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    border: 2px solid #e2e8f0;
                }

                .woocommerce-checkout .payment_method {
                    background: white;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    padding: 1rem;
                    border: 1px solid #e5e7eb;
                    transition: all 0.15s ease-in-out;
                }

                .woocommerce-checkout .payment_method:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
                }

                .woocommerce-checkout .payment_method input[type="radio"]:checked + label {
                    color: #3b82f6;
                    font-weight: 600;
                }

                /* Mobile responsive adjustments */
                @media (max-width: 768px) {
                    .woocommerce-checkout .form-row {
                        margin-bottom: 1.25rem;
                    }

                    .woocommerce-checkout .input-text,
                    .woocommerce-checkout select,
                    .woocommerce-checkout textarea {
                        font-size: 1rem;
                        padding: 0.875rem 1rem;
                    }

                    .woocommerce-checkout .form-row.etransfer-payer-handle .input-text {
                        padding-left: 2.75rem;
                        background-size: 1rem;
                        background-position: 0.875rem center;
                    }
                }
            </style>

            <script type="text/javascript">
                jQuery(document).ready(function($) {
                    // Enhanced form validation - only for eTransfer fields
                    $('.woocommerce-checkout').on('input blur', '.etransfer-payer-handle, .etransfer-id-upload', function() {
                        var $field = $(this);
                        var $row = $field.closest('.form-row');

                        // Remove previous validation classes - use eTransfer specific classes
                        $row.removeClass('etransfer-invalid etransfer-validated');

                        // Basic validation
                        if ($field.attr('required') && !$field.val()) {
                            $row.addClass('etransfer-invalid');
                        } else if ($field.val()) {
                            // Email validation for payer handle
                            if ($field.attr('type') === 'email' || $field.hasClass('etransfer-payer-handle')) {
                                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test($field.val())) {
                                    $row.addClass('etransfer-validated');
                                } else {
                                    $row.addClass('etransfer-invalid');
                                }
                            } else {
                                $row.addClass('etransfer-validated');
                            }
                        }
                    });

                    // Add smooth scrolling to validation errors
                    $(document.body).on('checkout_error', function() {
                        $('html, body').animate({
                            scrollTop: $('.woocommerce-error').offset().top - 100
                        }, 500);
                    });
                });
            </script>
            <?php
        }
    }

    /**
     * Enhance form fields with better styling
     */
    public function enhance_form_fields($field, $key, $args, $value) {
        // Add special class for payer handle field
        if (strpos($key, 'payer_handle') !== false || strpos($key, 'etransfer_email') !== false) {
            $args['class'][] = 'etransfer-payer-handle';
            $args['input_class'][] = 'etransfer-payer-handle';
        }

        return $field;
    }

    /**
     * Add E-Transfer payment gateway to WooCommerce
     */
    public function add_etransfer_gateway($gateways) {
        $gateways[] = 'ETransfer_Payment_Gateway';
        return $gateways;
    }

    /**
     * Display QR code in email
     */
    public function display_qr_code($order) {
        if (!get_option('etransfer_enable_qr_codes', 'yes')) {
            return;
        }

        try {
            $qr_url = generate_etransfer_qr_code($order->get_id());

            if ($qr_url) {
                echo '<div style="text-align: center; margin: 15px 0;">';
                echo '<p style="margin-bottom: 10px; font-weight: 600; color: #374151;">📱 Scan QR Code to Open Email:</p>';
                echo '<img src="' . esc_url($qr_url) . '" alt="E-Transfer QR Code" style="max-width: 200px; height: auto; border: 2px solid #e2e8f0; border-radius: 8px;" />';
                echo '<p style="margin-top: 10px; font-size: 12px; color: #64748b;">Scan to open your email app with pre-filled payment details</p>';
                echo '</div>';
            } else {
                // Fallback if QR generation fails
                echo '<div style="padding: 15px; text-align: center; background-color: #f8fafc; border-radius: 8px; margin: 15px 0;">';
                echo '<p style="color: #64748b; font-size: 14px; margin: 0;">💡 <strong>Quick Tip:</strong> Copy the email address and order details above to send your e-Transfer</p>';
                echo '</div>';
            }
        } catch (Exception $e) {
            error_log('E-Transfer QR display error: ' . $e->getMessage());
            // Silent fail - don't show error to customer
        }
    }

    /**
     * Add QR code to thank you page
     */
    public function add_qr_to_thankyou_page($order_id) {
        if (!$order_id) {
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order || $order->get_payment_method() !== 'etransfer') {
            return;
        }

        if (!get_option('etransfer_enable_qr_codes', 'yes')) {
            return;
        }

        echo '<div class="etransfer-thankyou-qr" style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 16px; text-align: center;">';
        echo '<h3 style="color: #0c4a6e; margin-bottom: 20px;">📱 Quick Payment with QR Code</h3>';

        $this->display_qr_code($order);

        echo '<div style="margin-top: 20px; padding: 15px; background-color: rgba(255,255,255,0.7); border-radius: 8px;">';
        echo '<p style="margin: 0; color: #374151; font-size: 14px;">';
        echo '<strong>Recipient:</strong> ' . esc_html(get_option('etransfer_recipient_email', '')) . '<br>';
        echo '<strong>Amount:</strong> ' . wp_kses_post($order->get_formatted_order_total()) . '<br>';
        echo '<strong>Reference:</strong> Order #' . esc_html($order->get_order_number());
        echo '</p>';
        echo '</div>';
        echo '</div>';
    }

    /**
     * Cleanup QR code files via cron
     */
    public function cleanup_qr_files() {
        if (class_exists('ETransfer_QR_Generator')) {
            $qr_generator = ETransfer_QR_Generator::get_instance();
            $qr_generator->cleanup_old_qr_files();
        }
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('E-Transfer Settings', 'etransfer-woocommerce'),
            __('E-Transfer', 'etransfer-woocommerce'),
            'manage_options',
            'etransfer-settings',
            array($this, 'admin_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('etransfer_settings', 'etransfer_recipient_email');
        register_setting('etransfer_settings', 'etransfer_enable_qr_codes');
        register_setting('etransfer_settings', 'etransfer_custom_instructions');
        register_setting('etransfer_settings', 'etransfer_backend_api_endpoint');
    }

    /**
     * Admin settings page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('etransfer_settings');
                do_settings_sections('etransfer_settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="etransfer_recipient_email"><?php _e('Recipient Email', 'etransfer-woocommerce'); ?></label>
                        </th>
                        <td>
                            <input type="email" id="etransfer_recipient_email" name="etransfer_recipient_email"
                                   value="<?php echo esc_attr(get_option('etransfer_recipient_email', '')); ?>"
                                   class="regular-text" />
                            <p class="description"><?php _e('Email address where customers should send e-Transfers.', 'etransfer-woocommerce'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="etransfer_backend_api_endpoint"><?php _e('Backend API Endpoint', 'etransfer-woocommerce'); ?></label>
                        </th>
                        <td>
                            <input type="url" id="etransfer_backend_api_endpoint" name="etransfer_backend_api_endpoint"
                                   value="<?php echo esc_attr(get_option('etransfer_backend_api_endpoint', 'https://e-transfer-be.onrender.com/api/orders')); ?>"
                                   class="regular-text" placeholder="https://e-transfer-be.onrender.com/api/orders" />
                            <p class="description"><?php _e('Backend API endpoint URL for processing payment orders.', 'etransfer-woocommerce'); ?></p>
                            <p>
                                <button type="button" id="test-api-connection" class="button"><?php _e('Test API Connection', 'etransfer-woocommerce'); ?></button>
                                <span id="api-test-result"></span>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="etransfer_enable_qr_codes"><?php _e('Enable QR Codes', 'etransfer-woocommerce'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" id="etransfer_enable_qr_codes" name="etransfer_enable_qr_codes"
                                   value="1" <?php checked(1, get_option('etransfer_enable_qr_codes', 0)); ?> />
                            <p class="description"><?php _e('Show QR codes in payment instruction emails.', 'etransfer-woocommerce'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="etransfer_custom_instructions"><?php _e('Custom Instructions', 'etransfer-woocommerce'); ?></label>
                        </th>
                        <td>
                            <textarea id="etransfer_custom_instructions" name="etransfer_custom_instructions"
                                      rows="5" cols="50" class="large-text"><?php echo esc_textarea(get_option('etransfer_custom_instructions', '')); ?></textarea>
                            <p class="description"><?php _e('Additional instructions to include in payment emails.', 'etransfer-woocommerce'); ?></p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <script>
            jQuery(document).ready(function($) {
                $('#test-api-connection').on('click', function() {
                    var $button = $(this);
                    var $result = $('#api-test-result');
                    var endpoint = $('#etransfer_backend_api_endpoint').val();
                    
                    $button.prop('disabled', true).text('Testing...');
                    $result.html('');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'test_etransfer_api',
                            endpoint: endpoint,
                            nonce: '<?php echo wp_create_nonce('test_etransfer_api'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                $result.html('<span style="color: green;">✓ ' + response.data + '</span>');
                            } else {
                                $result.html('<span style="color: red;">✗ ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            $result.html('<span style="color: red;">✗ Connection failed</span>');
                        },
                        complete: function() {
                            $button.prop('disabled', false).text('<?php _e('Test API Connection', 'etransfer-woocommerce'); ?>');
                        }
                    });
                });
            });
            </script>
        </div>
        <?php
    }

    /**
     * Test API connection
     */
    public function test_api_connection() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'test_etransfer_api')) {
            wp_die('Security check failed');
        }

        $endpoint = sanitize_url($_POST['endpoint']);
        
        if (empty($endpoint)) {
            wp_send_json_error('No endpoint provided');
            return;
        }

        // Test with a simple GET request to the health endpoint
        $health_endpoint = str_replace('/api/orders', '/health', $endpoint);
        
        $response = wp_remote_get($health_endpoint, array(
            'timeout' => 10,
        ));

        if (is_wp_error($response)) {
            wp_send_json_error('Connection failed: ' . $response->get_error_message());
            return;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code === 200) {
            // Also test bank accounts endpoint
            $api_base_url = str_replace('/api/orders', '', $endpoint);
            $accounts_endpoint = $api_base_url . '/api/bank-accounts';
            
            $accounts_response = wp_remote_get($accounts_endpoint, array(
                'timeout' => 10,
            ));
            
            if (is_wp_error($accounts_response)) {
                wp_send_json_success('API is accessible (HTTP ' . $response_code . ') but bank accounts endpoint failed: ' . $accounts_response->get_error_message());
            } else {
                $accounts_code = wp_remote_retrieve_response_code($accounts_response);
                if ($accounts_code === 200) {
                    wp_send_json_success('API and bank accounts endpoint are accessible (HTTP ' . $response_code . ')');
                } else {
                    wp_send_json_success('API is accessible (HTTP ' . $response_code . ') but bank accounts endpoint returned HTTP ' . $accounts_code);
                }
            }
        } else {
            wp_send_json_error('API returned HTTP ' . $response_code . ': ' . $response_body);
        }
    }

    /**
     * Show admin notice if WooCommerce is not active
     */
    public function woocommerce_missing_notice() {
        ?>
        <div class="error">
            <p><?php _e('E-Transfer WooCommerce Integration requires WooCommerce to be installed and active.', 'etransfer-woocommerce'); ?></p>
        </div>
        <?php
    }
}

// Initialize the plugin
add_action('plugins_loaded', function() {
    ETransfer_WooCommerce::get_instance();
});

// Activation hook
register_activation_hook(__FILE__, function() {
    // Set default options
    add_option('etransfer_recipient_email', get_option('admin_email'));
    add_option('etransfer_enable_qr_codes', 1);
    add_option('etransfer_custom_instructions', '');
    add_option('etransfer_backend_api_endpoint', 'https://e-transfer-be.onrender.com/api/orders');

    // Schedule QR code cleanup
    if (!wp_next_scheduled('etransfer_cleanup_qr_files')) {
        wp_schedule_event(time(), 'weekly', 'etransfer_cleanup_qr_files');
    }
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Clean up QR code files
    if (class_exists('ETransfer_QR_Generator')) {
        $qr_generator = ETransfer_QR_Generator::get_instance();
        $qr_generator->cleanup_old_qr_files();
    }

    // Clear scheduled cron
    wp_clear_scheduled_hook('etransfer_cleanup_qr_files');
});