
$(function() {
  var client = new DigitalOceanClient(getQueryStringParam('token'));
  var dropletCreator = new DropletCreator(client);
  var form = $('#dropletForm');
  var status = $('#status');

  var updateStatus = function(className, message) {
    form.hide();
    status.show().attr('class', className).find('.message').html(message);
  };

  status.find('button').click(function() {
    status.hide();
    form.show();
  });

  var asyncCounter = 0;
  var asyncEnd = function() {
    if (--asyncCounter === 0) {
      status.hide();
      form.show();
    }
  };
  $.each([
    function(cb) {
      client.get('/account/keys', function(err, res) {
        var select = form.find('select[name="sshKey"]');
        $.each(res.ssh_keys, function(i, key) {
          select.append('<option value="' + key.id + '">' + key.name + '</option>');
        });
        cb();
      });
    },
    function(cb) {
      client.get('/regions', function(err, res) {
        var select = form.find('select[name="region"]');
        $.each(res.regions, function(i, region) {
          if (!region.available || region.features.indexOf('metadata') === -1) return;
          select.append('<option value="' + region.slug + '">' + region.name + '</option>');
        });
        cb();
      });
    },
    function(cb) {
      client.get('/sizes', function(err, res) {
        var select = form.find('select[name="size"]');
        $.each(res.sizes, function(i, size) {
          var name = size.slug + ", " + size.vcpus + " CPU, " + size.disk + "GB HDD (" + size.price_monthly + "$/month)";
          select.append('<option value="' + size.slug + '">' + name + '</option>');
        });
        cb();
      });
    }
  ], function(i, func) {
    asyncCounter++;
    func(asyncEnd);
  });

  form.submit(function(e) {
    e.preventDefault();
    updateStatus('loading', 'Creating droplet...');
    var data = {};
    $.each(form.serializeArray(), function(i, field) {
      data[field.name] = field.value === 'TRUE' ? true : field.value;
    });
    dropletCreator.create(data, function(err, droplet) {
      if (err) {
        updateStatus('error', 'Failed to create the droplet');
        return;
      }
      dropletCreator.getIp(droplet.id, function(err, ip) {
        if (err) {
          document.location = '/success.html';
        } else {
          document.location = '/success.html#ip=' + ip;
        }
      });
    });
  });

});
