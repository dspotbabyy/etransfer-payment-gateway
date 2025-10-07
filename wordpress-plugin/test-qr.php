<?php
/**
 * Simple test script for QR code functionality
 * Run this from WordPress admin or via WP-CLI to test QR generation
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('This script must be run from within WordPress.');
}

// Test QR code generation
function test_etransfer_qr_generation() {
    // Check if classes are loaded
    if (!class_exists('ETransfer_QR_Generator')) {
        return array('error' => 'ETransfer_QR_Generator class not found');
    }

    // Create a mock order for testing
    $test_data = array(
        'order_id' => 'TEST-' . time(),
        'recipient_email' => get_option('etransfer_recipient_email', 'test@example.com'),
        'amount' => 99.99,
        'order_number' => 'TEST-' . time()
    );

    // Test mailto URL generation
    $subject = urlencode("Order-{$test_data['order_number']}");
    $body = urlencode("Amount: $" . number_format($test_data['amount'], 2));
    $mailto_url = "mailto:{$test_data['recipient_email']}?subject={$subject}&body={$body}";

    // Test Google Charts API URL generation
    $qr_api_url = 'https://chart.googleapis.com/chart?' . http_build_query([
        'chs' => '200x200',
        'cht' => 'qr',
        'chl' => $mailto_url,
        'choe' => 'UTF-8'
    ]);

    // Test API connectivity
    $response = wp_remote_get($qr_api_url, [
        'timeout' => 10,
        'user-agent' => 'WordPress E-Transfer Plugin Test'
    ]);

    $results = array(
        'test_data' => $test_data,
        'mailto_url' => $mailto_url,
        'qr_api_url' => $qr_api_url,
        'api_response' => array()
    );

    if (is_wp_error($response)) {
        $results['api_response']['error'] = $response->get_error_message();
    } else {
        $results['api_response']['status'] = wp_remote_retrieve_response_code($response);
        $results['api_response']['headers'] = wp_remote_retrieve_headers($response);
        $results['api_response']['body_length'] = strlen(wp_remote_retrieve_body($response));
    }

    // Test upload directory
    $upload_dir = wp_upload_dir();
    $qr_dir = $upload_dir['basedir'] . '/etransfer-qr';

    $results['upload_test'] = array(
        'wp_upload_dir' => $upload_dir,
        'qr_directory' => $qr_dir,
        'qr_dir_exists' => file_exists($qr_dir),
        'qr_dir_writable' => is_writable(dirname($qr_dir))
    );

    // Test settings
    $results['settings'] = array(
        'etransfer_recipient_email' => get_option('etransfer_recipient_email'),
        'etransfer_enable_qr_codes' => get_option('etransfer_enable_qr_codes'),
        'etransfer_custom_instructions' => get_option('etransfer_custom_instructions')
    );

    return $results;
}

// Only run if this file is accessed directly (for testing)
if (basename($_SERVER['SCRIPT_NAME']) === 'test-qr.php') {
    $test_results = test_etransfer_qr_generation();

    header('Content-Type: application/json');
    echo json_encode($test_results, JSON_PRETTY_PRINT);
    exit;
}