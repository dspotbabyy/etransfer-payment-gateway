<?php
/**
 * Simple QR Code Generator for E-Transfer Plugin
 *
 * A lightweight QR code generator that doesn't require Composer
 * Based on QR Code generator algorithm
 */

if (!defined('ABSPATH')) {
    exit;
}

class ETransfer_QR_Generator {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Generate QR code for e-Transfer payment
     */
    public function generate_etransfer_qr($order_id) {
        try {
            $order = wc_get_order($order_id);
            if (!$order) {
                return false;
            }

            // Get settings
            $recipient_email = get_option('etransfer_recipient_email', '');
            if (empty($recipient_email)) {
                error_log('E-Transfer QR: No recipient email configured');
                return false;
            }

            // Create mailto URL for QR code
            $amount = $order->get_total();
            $order_number = $order->get_order_number();
            $subject = urlencode("Order-{$order_number}");
            $body = urlencode("Amount: $" . number_format($amount, 2));

            $mailto_url = "mailto:{$recipient_email}?subject={$subject}&body={$body}";

            // Generate QR code using Google Charts API (fallback)
            $qr_url = $this->generate_qr_via_api($mailto_url, $order_id);

            if ($qr_url) {
                return $qr_url;
            }

            // If API fails, try local generation
            return $this->generate_qr_local($mailto_url, $order_id);

        } catch (Exception $e) {
            error_log('E-Transfer QR generation error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Generate QR code using external API (Google Charts)
     */
    private function generate_qr_via_api($data, $order_id) {
        // Create uploads directory if it doesn't exist
        $upload_dir = wp_upload_dir();

        if (!$upload_dir || isset($upload_dir['error'])) {
            error_log('E-Transfer QR: Upload directory error - ' . ($upload_dir['error'] ?? 'Unknown error'));
            return false;
        }

        $qr_dir = $upload_dir['basedir'] . '/etransfer-qr';

        if (!file_exists($qr_dir)) {
            if (!wp_mkdir_p($qr_dir)) {
                error_log('E-Transfer QR: Failed to create directory - ' . $qr_dir);
                return false;
            }
            // Add .htaccess to protect directory
            $htaccess_content = "Options -Indexes\nOrder deny,allow\nDeny from all\n";
            if (file_put_contents($qr_dir . '/.htaccess', $htaccess_content) === false) {
                error_log('E-Transfer QR: Failed to create .htaccess protection');
            }
        }

        $filename = "order-{$order_id}.png";
        $file_path = $qr_dir . '/' . $filename;

        // Check if file already exists and is recent (less than 1 hour old)
        if (file_exists($file_path) && (time() - filemtime($file_path)) < 3600) {
            return $upload_dir['baseurl'] . '/etransfer-qr/' . $filename;
        }

        // Generate QR using Google Charts API
        $qr_api_url = 'https://chart.googleapis.com/chart?' . http_build_query([
            'chs' => '200x200',
            'cht' => 'qr',
            'chl' => $data,
            'choe' => 'UTF-8'
        ]);

        // Download QR code
        $response = wp_remote_get($qr_api_url, [
            'timeout' => 30,
            'user-agent' => 'WordPress E-Transfer Plugin'
        ]);

        if (is_wp_error($response)) {
            error_log('QR API error: ' . $response->get_error_message());
            return false;
        }

        $qr_data = wp_remote_retrieve_body($response);
        if (empty($qr_data)) {
            return false;
        }

        // Save QR code image
        $bytes_written = file_put_contents($file_path, $qr_data);
        if ($bytes_written === false) {
            error_log('E-Transfer QR: Failed to save QR code to: ' . $file_path);
            return false;
        }

        if ($bytes_written === 0) {
            error_log('E-Transfer QR: Saved empty QR code file: ' . $file_path);
            unlink($file_path); // Clean up empty file
            return false;
        }

        // Verify file was saved properly
        if (!file_exists($file_path) || filesize($file_path) === 0) {
            error_log('E-Transfer QR: QR code file verification failed: ' . $file_path);
            return false;
        }

        return $upload_dir['baseurl'] . '/etransfer-qr/' . $filename;
    }

    /**
     * Generate QR code locally using simple matrix
     */
    private function generate_qr_local($data, $order_id) {
        // For now, return false to fall back to API
        // A full local QR implementation would be quite complex
        return false;
    }

    /**
     * Clean up old QR code files
     */
    public function cleanup_old_qr_files() {
        $upload_dir = wp_upload_dir();
        $qr_dir = $upload_dir['basedir'] . '/etransfer-qr';

        if (!is_dir($qr_dir)) {
            return;
        }

        $files = glob($qr_dir . '/order-*.png');
        $one_week_ago = time() - (7 * 24 * 60 * 60);

        foreach ($files as $file) {
            if (filemtime($file) < $one_week_ago) {
                unlink($file);
            }
        }
    }

    /**
     * Get QR code URL for order
     */
    public function get_qr_url($order_id) {
        $upload_dir = wp_upload_dir();
        $filename = "order-{$order_id}.png";
        $file_path = $upload_dir['basedir'] . '/etransfer-qr/' . $filename;

        if (file_exists($file_path)) {
            return $upload_dir['baseurl'] . '/etransfer-qr/' . $filename;
        }

        return false;
    }
}

/**
 * Helper function to generate e-Transfer QR code
 */
function generate_etransfer_qr_code($order_id) {
    if (!get_option('etransfer_enable_qr_codes', 'yes')) {
        return false;
    }

    $qr_generator = ETransfer_QR_Generator::get_instance();
    return $qr_generator->generate_etransfer_qr($order_id);
}