/*!
 * JavaScript for signup form.
 */
( function () {
	// When sending password by email, hide the password input fields.
	$( function () {
		// Always required if checked, otherwise it depends, so we use the original
		var $emailLabel = $( 'label[for="wpEmail"]' ),
			originalText = $emailLabel.text(),
			requiredText = mw.message( 'createacct-emailrequired' ).text(),
			$createByMailCheckbox = $( '#wpCreateaccountMail' ),
			$beforePwds = $( '.mw-row-password' ).first().prev(),
			$pwds;

		function updateForCheckbox() {
			var checked = $createByMailCheckbox.prop( 'checked' );
			if ( checked ) {
				$pwds = $( '.mw-row-password' ).detach();
				$emailLabel.text( requiredText );
			} else {
				if ( $pwds ) {
					$beforePwds.after( $pwds );
					$pwds = null;
				}
				$emailLabel.text( originalText );
			}
		}

		$createByMailCheckbox.on( 'change', updateForCheckbox );
		updateForCheckbox();
	} );
	// When typing in a reason for account creation, show confirmation box if the input is an email address
	$( function () {
		// Always required if checked, otherwise it depends, so we use the original
		var re = /\S+@\S+\.\S+/,	// Regex for email address verification
		$createByMailCheckbox = $( '#wpCreateaccountConfirmReason' );

		function updateForCheckbox() {
			var testResult = re.test( $( "#wpReason" ).val() ),
			checked = $createByMailCheckbox.prop( 'checked' );
			if ( testResult ) {
				if ( !checked ) {
					$('#wpCreateaccount').addClass('mw-field-hidden');	// Confirmation checkbox unchecked, hide create account button
				} else {
					$('#wpCreateaccount').removeClass('mw-field-hidden');	// Confirmation checkbox has been checked, show create account button again
				}
				// Creation reason is a password. Ask user to confirm.
				$('.mw-field-confirmreason').removeClass('mw-field-hidden');
			} else {
				// Creation reason is not a password, hide checkbox
				 $('.mw-field-confirmreason').addClass('mw-field-hidden');
				 $('#wpCreateaccount').removeClass('mw-field-hidden');	// make sure that create account button is visible
			}			
		}
		
		// Two listeners are required here for both scenarios (text and checkbox click)
		$( '#wpReason' ).on( 'change', updateForCheckbox );
		$createByMailCheckbox.on( 'change', updateForCheckbox );
		updateForCheckbox();
	} );

	// Check if the username is invalid or already taken; show username normalisation warning
	mw.hook( 'htmlform.enhance' ).add( function ( $root ) {
		var $usernameInput = $root.find( '#wpName2' ),
			$passwordInput = $root.find( '#wpPassword2' ),
			$emailInput = $root.find( '#wpEmail' ),
			$realNameInput = $root.find( '#wpRealName' ),
			api = new mw.Api(),
			usernameChecker, passwordChecker;

		function checkUsername( username ) {
			// We could just use .then() if we didn't have to pass on .abort()…
			var d, apiPromise;

			// Leading/trailing/multiple whitespace characters are always stripped in usernames,
			// this should not require a warning. We do warn about underscores.
			username = username.replace( / +/g, ' ' ).trim();

			d = $.Deferred();
			apiPromise = api.get( {
				action: 'query',
				list: 'users',
				ususers: username,
				usprop: 'cancreate',
				formatversion: 2,
				errorformat: 'html',
				errorsuselocal: true,
				uselang: mw.config.get( 'wgUserLanguage' )
			} )
				.done( function ( resp ) {
					var userinfo = resp.query.users[ 0 ];

					if ( resp.query.users.length !== 1 || userinfo.invalid ) {
						d.resolve( { valid: false, messages: [ mw.message( 'noname' ).parseDom() ] } );
					} else if ( userinfo.userid !== undefined ) {
						d.resolve( { valid: false, messages: [ mw.message( 'userexists' ).parseDom() ] } );
					} else if ( !userinfo.cancreate ) {
						d.resolve( {
							valid: false,
							messages: userinfo.cancreateerror ? userinfo.cancreateerror.map( function ( m ) {
								return m.html;
							} ) : []
						} );
					} else if ( userinfo.name !== username ) {
						d.resolve( { valid: true, messages: [
							mw.message( 'createacct-normalization', username, userinfo.name ).parseDom()
						] } );
					} else {
						d.resolve( { valid: true, messages: [] } );
					}
				} )
				.fail( d.reject );

			return d.promise( { abort: apiPromise.abort } );
		}

		function checkPassword() {
			// We could just use .then() if we didn't have to pass on .abort()…
			var apiPromise,
				d = $.Deferred();

			if ( $usernameInput.val().trim() === '' ) {
				d.resolve( { valid: true, messages: [] } );
				return d.promise();
			}

			apiPromise = api.post( {
				action: 'validatepassword',
				user: $usernameInput.val(),
				password: $passwordInput.val(),
				email: $emailInput.val() || '',
				realname: $realNameInput.val() || '',
				formatversion: 2,
				errorformat: 'html',
				errorsuselocal: true,
				uselang: mw.config.get( 'wgUserLanguage' )
			} )
				.done( function ( resp ) {
					var pwinfo = resp.validatepassword || {};

					d.resolve( {
						valid: pwinfo.validity === 'Good',
						messages: pwinfo.validitymessages ? pwinfo.validitymessages.map( function ( m ) {
							return m.html;
						} ) : []
					} );
				} )
				.fail( d.reject );

			return d.promise( { abort: apiPromise.abort } );
		}

		usernameChecker = new mw.htmlform.Checker( $usernameInput, checkUsername );
		usernameChecker.attach();

		passwordChecker = new mw.htmlform.Checker( $passwordInput, checkPassword );
		passwordChecker.attach( $usernameInput.add( $emailInput ).add( $realNameInput ) );
	} );
}() );
