'use strict';

exports = module.exports = function(app, mongoose) {
  var tutorialSchema = new mongoose.Schema({
    _id: { type: String },
    author: { type: String, default: '' },
    name: { type: String, default: '' }
  });
  tutorialSchema.plugin(require('./plugins/pagedFind'));
  tutorialSchema.index({ author: 1 });
  tutorialSchema.index({ name: 1 });
  tutorialSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Tutorial', tutorialSchema);
};
