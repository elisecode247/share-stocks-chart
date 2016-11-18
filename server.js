var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var request = require('request');
var jsonfile = require('jsonfile');
var file = 'app/companies.json';

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/app', express.static(process.cwd() + '/app'));

app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'pug');

app.get('/', function(req, res) {
  res.render("index");

});

app.get('/api/company/:company', function(req, res) {
  var apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/' +
    req.params.company + '.json?start_date=' + formatDate(365) +
    '&end_date=' + formatDate(1) +
    '&order=asc&column_index=1&api_key=B4_x1rzypeW4D7N797RK';
  request(apiUrl, function(error, response, body) {
    if (error) throw error;
    res.json(JSON.parse(body));
  });
});

io.on('connection', function(socket) {
  socket.on('new', function() {
    jsonfile.readFile(file, function(err, data) {
      socket.emit('new', data);
    });
  });
  socket.on('add company', function(company) {
    var apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/' +
      company + '.json?start_date=' + formatDate(365) +
      '&end_date=' + formatDate(1) +
      '&order=asc&column_index=1&api_key=B4_x1rzypeW4D7N797RK';
    request(apiUrl, function(error, response, body) {
      if (error) throw error;
      console.log('status code' + response.statusCode);
      if (response.statusCode === 200) {
        var jsonObj = JSON.parse(body)
        appendObject(jsonObj.dataset.dataset_code)
        io.emit('add company', body);
      }
      else {
        socket.emit('add company', 'error');
      }
    });
  });
  socket.on('delete company', function(company) {
    console.log('company: ' + company);
    pullCompany(company);
    io.emit('delete company', company);
  });
});

http.listen(process.env.PORT, function() {
  console.log('listening on *:8080');
});


function appendObject(str) {
  jsonfile.readFile(file, function(err, data) {
    if (err) throw err;
    if (data.companies.indexOf(str) > -1) {
      // do nothing
    }
    else {
      data.companies.push(str);
      jsonfile.writeFile(file, data, function(err) {
        console.error(err);
      });
    }
  });

}

function pullCompany(str) {
  jsonfile.readFile(file, function(err, data) {
    var arr = data.companies;
    if (err) throw err;
    var found = arr.indexOf(str);
    if (found !== -1) {
        arr.splice(found, 1);
    }
    console.log('data: ' + data);
          jsonfile.writeFile(file, data, function(err) {
        console.error(err);
      });
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
