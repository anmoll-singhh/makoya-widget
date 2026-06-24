<?php
/**
 * Uninstall handler for Makoya Accessibility.
 *
 * Runs ONLY when the user deletes the plugin from the WordPress admin (not on
 * deactivate). WordPress sets WP_UNINSTALL_PLUGIN before loading this file; if
 * it is not defined we are being accessed directly and must bail.
 *
 * We store everything in a single option (makoya_settings), so cleanup is one
 * delete_option() call. We hard-code the option name here rather than depending
 * on constants from the main plugin file, because the main file is NOT loaded
 * during uninstall.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Remove the plugin's settings.
delete_option( 'makoya_settings' );

// On multisite, also clean the option from every site in the network.
if ( is_multisite() ) {
	$site_ids = get_sites( array( 'fields' => 'ids' ) );
	foreach ( $site_ids as $site_id ) {
		switch_to_blog( $site_id );
		delete_option( 'makoya_settings' );
		restore_current_blog();
	}
}
