var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path');
var request = require('request');
var jsonfile = require('jsonfile');

var file = 'app/companies.json';
var url = require('url');
var mongoose = require('mongoose');

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI);

var Company = mongoose.model('Company', {
  companies: Array
});

var quandlOptions = {
  protocol: 'https',
  hostname: 'www.quandl.com',
  pathname: '/api/v3/datasets/WIKI/',
  query: {
    'start_date': formatDate(365),
    'end_date': formatDate(1),
    'order': 'asc',
    'column_index': 1,
    'api_key': process.env.API_KEY

  }
};

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/app', express.static(process.cwd() + '/app'));

app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'pug');

app.get('/', function(req, res) {
  res.render('index');

});

app.get('/api/company/:company', function(req, res) {
  quandlOptions.pathname = '/api/v3/datasets/WIKI/' +
    req.params.company + '.json';
  var apiUrl = url.format(quandlOptions);
  request(apiUrl, function(error, response, body) {
    if (error) throw error;
    res.json(JSON.parse(body));
  });
});

io.on('connection', function(socket) {
  socket.on('new', function() {
    Company.findOne()
      .exec(function(err, data) {
        if (err) throw err;
        socket.emit('new', data.companies);
      });

  });
  socket.on('add company', function(company) {
    quandlOptions.pathname = '/api/v3/datasets/WIKI/' + company + '.json';
    var apiUrl = url.format(quandlOptions);
    request(apiUrl, function(error, response, body) {
      if (error) throw error;
      if (response.statusCode === 200) {
        var jsonObj = JSON.parse(body)
        appendObject(jsonObj.dataset.dataset_code)
        io.emit('add company', jsonObj);
      }
      else {
        socket.emit('add company', 'error');
      }
    });
  });
  socket.on('delete company', function(company) {
    pullCompany(company);
    io.emit('delete company', company);
  });
});

http.listen(process.env.PORT, function() {
  console.log('listening on :' + process.env.PORT);
});


function appendObject(str) {
  console.log(str);
  Company.findOneAndUpdate({}, {
      $addToSet: {
        'companies': str
      }
    })
    .exec(function(err, data) {
      if (err) throw err;
    });
}

function pullCompany(str) {
  Company.findOneAndUpdate({}, {
      $pull: {
        'companies': str
      }
    })
    .exec(function(err, data) {
      if (err) throw err;
    });
}

function formatDate(days) {
  var date = new Date();
  date.setDate(date.getDate() - days);
  var month = '' + (date.getMonth() + 1),
    day = '' + date.getDate(),
    year = date.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}
