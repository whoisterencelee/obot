/*jslint node: true */
'use strict';
const constants = require('ocore/constants.js');
const conf = require('ocore/conf');
const db = require('ocore/db');
const eventBus = require('ocore/event_bus');
const validationUtils = require('ocore/validation_utils');
const headlessWallet = require('headless-obyte');
const walletGeneral = require('ocore/wallet_general.js');
const device = require('ocore/device.js');
const objectHash = require('ocore/object_hash.js');

function log( msg ){ process.stdout.write( msg + "\n" ) }

/**
 * headless wallet is ready
 */
eventBus.once('headless_wallet_ready', () => {
	headlessWallet.setupChatEventHandlers();
	
	/**
	 * user pairs his device with the bot
	 */
	eventBus.on('paired', (from_address, pairing_secret) => {
		// send a geeting message
		const device = require('ocore/device.js');
		device.sendMessageToDevice(from_address, 'text', "Welcome to my new shiny bot!");
	});

	/**
	 * user sends message to the bot
	 */
	eventBus.on('text', (from_address, text) => {
		// analyze the text and respond
		text = text.trim();
		
		if (!text.match(/^You said/))
			device.sendMessageToDevice(from_address, 'text', "You said: " + text);
	});

});

var logdevice = "0QHB5OQMURN3LXYXWA62KI33E47UJNQMJ"

var processor_adddress = "Z5OZYHRGUSNIHUVBQIAMV7XQNDZKPQKE"

var obot_address = "KYDLE44HA4IU2B3CGO456OA5VRHBBPSL"

var processing = {}

walletGeneral.addWatchedAddress(obot_address, () => { eventBus.on( 'aa_response_from_aa-' + obot_address, (objAAResponse) => {

	// handle event
	var msg = "event from " + obot_address + " :  " + JSON.stringify( objAAResponse )
	// log( msg )
	// device.sendMessageToDevice( registered , 'text' , msg ) 

	var trigger_address = objAAResponse.trigger_address
	if( trigger_address == processor_adddress ) return // ignore AA events triggered by this bot's trigger and response units

	var responseVars = objAAResponse.response.responseVars 
	if( !responseVars ) return // event without a responseVars
	var job = responseVars.job

	if( !processing[ job ] ){  	// just received trigger unit event, start processing
	
		processing[ job ] = {}

		if( responseVars.args == false ) var result = "missing args = [ 4 , 1 , 3 , 2 ]"
		else {

			try{
			var arr = JSON.parse( responseVars.args )

			log( "processing job " + job + " args " + JSON.stringify( arr ) )

			// ACTUAL PROCESSING
			var result = arr.sort( ( a , b ) => a > b ) 

			}catch( e ){
			var result = e.toString()
			}
		}

		log( "result " + JSON.stringify( result ) )

		processing[ job ].result = result // store result for sending after payment stablized (receive response unit event)

	} else {			// received response unit event, assume trigger unit (payment) stablized

		var result = processing[ job ].result

		var json_data = { job: job , result: JSON.stringify( result ) }

		delete processing[ job ]

		var opts = {
			paying_addresses: [ processor_adddress ],
			change_address: processor_adddress ,
			messages: [
				{ app: 'data',
					payload_location: 'inline' ,
					payload_hash: objectHash.getBase64Hash( json_data ),
					payload: json_data
				}
			],
			to_address: obot_address ,
			amount: 10000
		}
		headlessWallet.sendMultiPayment( opts , ( err , unit ) => {
			if( err ) return log( err )

			//successful
			log( "job " + job + " sent back result " + JSON.stringify( result ) ) 
		})

	}
	
}) })


/**
 * user pays to the bot
 */
eventBus.on('new_my_transactions', (arrUnits) => {
	// handle new unconfirmed payments
	// and notify user
	
//	const device = require('ocore/device.js');
//	device.sendMessageToDevice(device_address_determined_by_analyzing_the_payment, 'text', "Received your payment");
});

/**
 * payment is confirmed
 */
eventBus.on('my_transactions_became_stable', (arrUnits) => {
	// handle payments becoming confirmed
	// and notify user
	
//	const device = require('ocore/device.js');
//	device.sendMessageToDevice(device_address_determined_by_analyzing_the_payment, 'text', "Your payment is confirmed");
});



process.on('unhandledRejection', up => { throw up; });
