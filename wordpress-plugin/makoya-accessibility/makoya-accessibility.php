<?php
/**
 * Plugin Name:       Makoya Accessibility
 * Plugin URI:        https://makoya-gamma.vercel.app
 * Description:        Adds the Makoya accessibility widget to your site. Visitors get a launcher button and a settings panel offering text-size, spacing, contrast, reading aids and more accessibility preferences. Paste your Site ID and Token from your Makoya dashboard and the widget loads on every page.
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            Makoya
 * Author URI:        https://makoya-gamma.vercel.app
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       makoya-accessibility
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Makoya's widget is a single <script> tag that a site owner pastes once. This
 * plugin removes the "edit theme files" step for WordPress merchants: they enter
 * their Site ID + Token in a settings screen, and the plugin emits the exact
 * contract snippet into the page <head> on the public frontend.
 *
 * THE SNIPPET CONTRACT (must match byte-for-byte across every Makoya install path):
 *   <script src="https://makoya-gamma.vercel.app/widget/loader.js"
 *           data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
 *
 * - data-site  : the site UUID the merchant copies from their Makoya dashboard.
 * - data-token : an opaque signature the merchant copies from the same dashboard.
 *                Optional for back-compat: a token-less snippet still works in
 *                monitor mode, so we only render data-token when it is non-empty.
 *
 * SECURITY: all inputs are sanitized on save (sanitize_text_field / esc_url_raw)
 * and ALL output is escaped at print time (esc_attr / esc_url). Direct access is
 * blocked. Functions and the option name are prefixed `makoya_`.
 */

// Block direct access — this file must only run inside WordPress.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The canonical, production loader URL. Used as the default for the optional
 * "Loader URL" override so the merchant never has to type it by hand.
 */
if ( ! defined( 'MAKOYA_DEFAULT_LOADER_URL' ) ) {
	define( 'MAKOYA_DEFAULT_LOADER_URL', 'https://makoya-gamma.vercel.app/widget/loader.js' );
}

/**
 * Single option name. We store all settings in one associative array so install
 * and uninstall stay trivial (one option to delete).
 */
if ( ! defined( 'MAKOYA_OPTION_NAME' ) ) {
	define( 'MAKOYA_OPTION_NAME', 'makoya_settings' );
}

/**
 * Return the saved settings merged with sane defaults.
 *
 * @return array{site_id:string, token:string, loader_url:string}
 */
function makoya_get_settings() {
	$defaults = array(
		'site_id'    => '',
		'token'      => '',
		'loader_url' => MAKOYA_DEFAULT_LOADER_URL,
	);

	$saved = get_option( MAKOYA_OPTION_NAME, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}

	return wp_parse_args( $saved, $defaults );
}

/* -------------------------------------------------------------------------- */
/*  Settings registration (WP Settings API)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Register the setting, section, and fields. Hooked on `admin_init`.
 */
function makoya_register_settings() {
	register_setting(
		'makoya_settings_group',   // option group (matches settings_fields()).
		MAKOYA_OPTION_NAME,        // option name.
		array(
			'type'              => 'array',
			'sanitize_callback' => 'makoya_sanitize_settings',
			'default'           => array(),
		)
	);

	add_settings_section(
		'makoya_main_section',
		__( 'Makoya widget settings', 'makoya-accessibility' ),
		'makoya_section_intro',
		'makoya-accessibility'   // page slug (matches the menu / do_settings_sections()).
	);

	add_settings_field(
		'makoya_site_id',
		__( 'Site ID', 'makoya-accessibility' ),
		'makoya_field_site_id',
		'makoya-accessibility',
		'makoya_main_section'
	);

	add_settings_field(
		'makoya_token',
		__( 'Token', 'makoya-accessibility' ),
		'makoya_field_token',
		'makoya-accessibility',
		'makoya_main_section'
	);

	add_settings_field(
		'makoya_loader_url',
		__( 'Loader URL', 'makoya-accessibility' ),
		'makoya_field_loader_url',
		'makoya-accessibility',
		'makoya_main_section'
	);
}
add_action( 'admin_init', 'makoya_register_settings' );

/**
 * Sanitize every field before it is persisted.
 *
 * @param mixed $input Raw submitted values.
 * @return array Clean values.
 */
function makoya_sanitize_settings( $input ) {
	if ( ! is_array( $input ) ) {
		$input = array();
	}

	$clean = array();

	// Site ID + Token are opaque strings the merchant pastes from the dashboard.
	$clean['site_id'] = isset( $input['site_id'] ) ? sanitize_text_field( $input['site_id'] ) : '';
	$clean['token']   = isset( $input['token'] ) ? sanitize_text_field( $input['token'] ) : '';

	// Loader URL: validate as a URL; fall back to the default if emptied/invalid.
	$loader_url = isset( $input['loader_url'] ) ? esc_url_raw( trim( $input['loader_url'] ) ) : '';
	if ( '' === $loader_url ) {
		$loader_url = MAKOYA_DEFAULT_LOADER_URL;
	}
	$clean['loader_url'] = $loader_url;

	return $clean;
}

/* -------------------------------------------------------------------------- */
/*  Admin menu + settings page                                                */
/* -------------------------------------------------------------------------- */

/**
 * Add "Makoya Accessibility" under the Settings menu.
 */
function makoya_add_settings_page() {
	add_options_page(
		__( 'Makoya Accessibility', 'makoya-accessibility' ), // page <title>.
		__( 'Makoya Accessibility', 'makoya-accessibility' ), // menu label.
		'manage_options',                                     // capability.
		'makoya-accessibility',                               // menu slug.
		'makoya_render_settings_page'                         // render callback.
	);
}
add_action( 'admin_menu', 'makoya_add_settings_page' );

/**
 * Section intro copy.
 */
function makoya_section_intro() {
	echo '<p>' . esc_html__(
		'Paste the Site ID and Token from your Makoya dashboard. The widget then loads on every public page of your site.',
		'makoya-accessibility'
	) . '</p>';
}

/**
 * Site ID field.
 */
function makoya_field_site_id() {
	$settings = makoya_get_settings();
	printf(
		'<input type="text" id="makoya_site_id" name="%1$s[site_id]" value="%2$s" class="regular-text" autocomplete="off" />',
		esc_attr( MAKOYA_OPTION_NAME ),
		esc_attr( $settings['site_id'] )
	);
	echo '<p class="description">' . esc_html__(
		'Required. Your site UUID from the Makoya dashboard. The widget will not load until this is set.',
		'makoya-accessibility'
	) . '</p>';
}

/**
 * Token field.
 */
function makoya_field_token() {
	$settings = makoya_get_settings();
	printf(
		'<input type="text" id="makoya_token" name="%1$s[token]" value="%2$s" class="regular-text" autocomplete="off" />',
		esc_attr( MAKOYA_OPTION_NAME ),
		esc_attr( $settings['token'] )
	);
	echo '<p class="description">' . esc_html__(
		'Optional but recommended. The signed token from your Makoya dashboard. Leave blank to run in monitor mode.',
		'makoya-accessibility'
	) . '</p>';
}

/**
 * Loader URL field.
 */
function makoya_field_loader_url() {
	$settings = makoya_get_settings();
	printf(
		'<input type="url" id="makoya_loader_url" name="%1$s[loader_url]" value="%2$s" class="regular-text" placeholder="%3$s" />',
		esc_attr( MAKOYA_OPTION_NAME ),
		esc_attr( $settings['loader_url'] ),
		esc_attr( MAKOYA_DEFAULT_LOADER_URL )
	);
	echo '<p class="description">' . esc_html__(
		'Advanced. Leave as the default unless Makoya support tells you otherwise.',
		'makoya-accessibility'
	) . '</p>';
}

/**
 * Render the settings page wrapper + form. `settings_fields()` outputs the
 * nonce + option-group hidden fields; the Settings API handles the POST.
 */
function makoya_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php echo esc_html__( 'Makoya Accessibility', 'makoya-accessibility' ); ?></h1>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'makoya_settings_group' );
			do_settings_sections( 'makoya-accessibility' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}

/* -------------------------------------------------------------------------- */
/*  Frontend injection — emit the contract snippet into <head>                */
/* -------------------------------------------------------------------------- */

/**
 * Print the Makoya loader <script> into the public page <head>.
 *
 * We use `wp_head` (rather than wp_enqueue_script) because the contract snippet
 * carries custom `data-*` attributes and a `defer` flag in a fixed shape; emitting
 * it directly keeps the output byte-identical to every other Makoya install path.
 *
 * Guard: render NOTHING unless a Site ID is set, and never in the admin area.
 */
function makoya_render_widget_snippet() {
	if ( is_admin() ) {
		return;
	}

	$settings = makoya_get_settings();

	$site_id = trim( $settings['site_id'] );
	if ( '' === $site_id ) {
		return; // No Site ID → do not load the widget.
	}

	$loader_url = trim( $settings['loader_url'] );
	if ( '' === $loader_url ) {
		$loader_url = MAKOYA_DEFAULT_LOADER_URL;
	}

	$token = trim( $settings['token'] );

	// Build the snippet. data-token is only included when non-empty (back-compat
	// with token-less monitor-mode installs).
	$attributes = sprintf( ' data-site="%s"', esc_attr( $site_id ) );
	if ( '' !== $token ) {
		$attributes .= sprintf( ' data-token="%s"', esc_attr( $token ) );
	}

	printf(
		'<script src="%1$s"%2$s defer></script>' . "\n",
		esc_url( $loader_url ),
		$attributes // Already escaped per-attribute above via esc_attr().
	);
}
add_action( 'wp_head', 'makoya_render_widget_snippet' );
