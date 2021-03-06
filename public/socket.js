var socket = io(),
    chart,
    seriesOptions = [],
    seriesCounter = 0,
    names = [];

$('#search-form').submit(function() {
    var symbol = $('#search-input').val().toUpperCase().trim();
    (names.indexOf(symbol) > -1) ? alert(symbol + ' is already in the chart.') :
        socket.emit('add company', symbol);
    $('#search-input').val('');
    return false;
});

$(document).ready(function() {
    socket.emit('new');
});

socket.on('new', function(data) {
    names = data;
    createChartData();
});

socket.on('add company', function(data) {
    if (data !== 'error') {
        addCompany(data);
    }
    else {
        alert('company not found');
    }
});

socket.on('delete company', function(symbol) {
    $('button[data-company="' + symbol + '"]').parent().remove();
    var index = seriesOptions.findIndex(function(obj) {
        return obj.name === symbol;
    });
    if (index !== -1) {
        names.splice(names.indexOf(symbol), 1);
        seriesOptions.splice(index, 1);
        chart.series[index].remove();
    }


});

function addCompany(data) {
    var myData;
    (typeof data === 'string') ? myData = JSON.parse(myData): myData = data;
    if (names.indexOf(myData.dataset.dataset_code) === -1) {
        var modifiedData = myData.dataset.data.map(function(val) {
            val[0] = Date.parse(val[0]);
            return val;
        });
        names.push(myData.dataset.dataset_code);
        seriesOptions[seriesOptions.length] = {
            name: myData.dataset.dataset_code,
            data: modifiedData
        };
        (names.length === 1) ? createChart():
            chart.addSeries(seriesOptions[seriesOptions.length - 1]);
        createCard(myData.dataset.dataset_code, myData.dataset.name);
    }
}

function createCard(symbol, name) {
    $('#companies').prepend('<div class="card card-block col-sm-6">' + 
        '<button data-company="' + symbol + '" class="btn btn-sm closeCard"' +
        '>X</button><h3>' +
        symbol + '</h3><p>' + name + '</p></div>');
    $('button[data-company="' + symbol + '"]').on("click", function() {
        socket.emit('delete company', symbol);
    });
}


function createChart() {
    chart = Highcharts.StockChart('chart-container', {
        rangeSelector: {
            selected: 1
        },
        title: {
            text: 'Closing Stock Prices'
        },
        yAxis: {
            labels: {
                formatter: function() {
                    return '$' + this.value;
                }
            },
        },
        series: seriesOptions
    });
}

function createChartData() {
    $.each(names, function(i, name) {
        $.getJSON('/api/company/' + name, function(myData) {
            var modifiedData = myData.dataset.data.map(function(val) {
                val[0] = Date.parse(val[0]);
                return val;
            });
            seriesOptions[i] = {
                name: myData.dataset.dataset_code,
                data: modifiedData
            };
            seriesCounter += 1;
            createCard(myData.dataset.dataset_code, myData.dataset.name);
            if (seriesCounter === names.length) {
                createChart();
            }
        });
    });
}
