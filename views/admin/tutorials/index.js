'use strict';

exports.find = function(req, res, next){
  req.query.pivot = req.query.pivot ? req.query.pivot : '';
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.pivot) {
    filters.pivot = new RegExp('^.*?'+ req.query.pivot +'.*$', 'i');
  }
  if (req.query.name) {
    filters.name = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
  }

  req.app.db.models.Tutorial.pagedFind({
    filters: filters,
    keys: 'pivot name',
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('admin/tutorials/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.Tutorial.findById(req.params.id).exec(function(err, tutorial) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(tutorial);
    }
    else {
      res.render('admin/tutorials/details', { data: { record: escape(JSON.stringify(tutorial)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not create tutorials.');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errors.push('A name is required.');
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errors.push('A name is required.');
      return workflow.emit('response');
    }

    workflow.emit('duplicateTutorialCheck');
  });

  workflow.on('duplicateTutorialCheck', function() {
    req.app.db.models.Tutorial.findById(req.app.utility.slugify(req.body.pivot +' '+ req.body.name)).exec(function(err, tutorial) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (tutorial) {
        workflow.outcome.errors.push('That tutorial+pivot is already taken.');
        return workflow.emit('response');
      }

      workflow.emit('createTutorial');
    });
  });

  workflow.on('createTutorial', function() {
    var fieldsToSet = {
      _id: req.app.utility.slugify(req.body.pivot +' '+ req.body.name),
      pivot: req.body.pivot,
      name: req.body.name
    };

    req.app.db.models.Tutorial.create(fieldsToSet, function(err, tutorial) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = tutorial;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not update tutorials.');
      return workflow.emit('response');
    }

    if (!req.body.pivot) {
      workflow.outcome.errfor.pivot = 'pivot';
      return workflow.emit('response');
    }

    if (!req.body.name) {
      workflow.outcome.errfor.name = 'required';
      return workflow.emit('response');
    }

    workflow.emit('patchTutorial');
  });

  workflow.on('patchTutorial', function() {
    var fieldsToSet = {
      pivot: req.body.pivot,
      name: req.body.name
    };

    req.app.db.models.Tutorial.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, tutorial) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.tutorial = tutorial;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not delete tutorials.');
      return workflow.emit('response');
    }

    workflow.emit('deleteTutorial');
  });

  workflow.on('deleteTutorial', function(err) {
    req.app.db.models.Tutorial.findByIdAndRemove(req.params.id, function(err, tutorial) {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
