require('dotenv').config();
var GB_API_KEY =  process.env.GB_API_KEY;
var createCsvWriter = require('csv-writer').createArrayCsvWriter;
var csvWriter = createCsvWriter({
	header: ["PRICE", "TIME"],
	path: '../../Dropbox/bitcoinprice.csv'
});
var gb = require("geckoboard")(GB_API_KEY);
var axios = require('axios');
var lowPrice;
var highPrice;

getBitcoinPrice();


function addToGeckoboard(price, time) {
	gb.ping(function (error){
    if (error) {
      console.error(error);
      return;
    }

    console.log("Authentication Sucessful");
  });

	gb.datasets.findOrCreate(
		{
			id: "bitcoin_price.by_minute",
			fields: {
				price: {
					type: "money",
					name: "USD bitcoin price",
					currency_code: "USD" 
				},
				time:{
					type: "datetime",
					name: "Time"
				}
			}
		},

		function(err, dataset){
			if (err){
				console.log(err);
				return;
			}
			dataset.post(
				[
					{price: price, time: time}
				],
				{},
				function(err){
					if (err) {
						console.error(err);
						return
					}

					console.log("dataset updated");
				}
			);

		}
	);
}

function postToCustomWidget(price){
	axios.post("https://push.geckoboard.com/v1/send/129109-74c73d40-5fd0-0136-2634-22000b1987d4",
		{"api_key": GB_API_KEY, "data": {
				"item": price, 
				"min": {"value": lowPrice }, 
				"max": {"value": highPrice }
				}
		})
	.then(response => {
		console.log(response);
	})
	.catch(error => {
		console.error(error);
	})

}


function getBitcoinPrice(){
	axios.get("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
		.then(response => {
			var price = response.data.bpi.USD.rate_float.toFixed(2);
			var time = response.data.time.updatedISO;
			price < lowPrice || !lowPrice ? lowPrice = price : null;
			price > highPrice || !highPrice ? highPrice = price : null;
			addToGeckoboard((price * 100), time);
			postToCustomWidget(price);
			csvWriter.writeRecords([[price, time]])
				.then(()=>{
					console.log('written to CSV file');
				});
		})
		.catch(err => {
			console.error(err);
		});
		setTimeout(getBitcoinPrice, 60000);
	}


