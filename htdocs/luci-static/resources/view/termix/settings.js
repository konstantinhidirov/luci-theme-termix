'use strict';
'require view';
'require form';

return view.extend({
  render: function() {
    var map = new form.Map('termix', _('Termix Theme'),
      _('Choose the appearance of the LuCI interface. Apply the changes and reload the page to see them.'));
    var section = map.section(form.NamedSection, 'settings', 'theme');
    section.anonymous = true;
    section.tab('appearance', _('Appearance'));
    section.tab('effects', _('Effects'),
      _('Matrix adds code rain, glow and optional scanlines in dark mode. Effects pause while a dialog is open and respect your device’s reduced motion setting.'));

    var mode = section.taboption('appearance', form.ListValue, 'mode', _('Color mode'));
    mode.value('dark', _('Dark'));
    mode.value('light', _('Light'));
    mode.value('system', _('Follow system'));
    mode.default = 'dark';

    var accent = section.taboption('appearance', form.ListValue, 'accent', _('Accent color'));
    [
      ['orange', _('Orange')], ['blue', _('Blue')], ['green', _('Green')],
      ['purple', _('Purple')], ['pink', _('Pink')], ['cyan', _('Cyan')],
      ['red', _('Red')], ['yellow', _('Yellow')], ['teal', _('Teal')],
      ['indigo', _('Indigo')], ['rose', _('Rose')], ['lime', _('Lime')],
      ['matrix', _('Matrix')], ['custom', _('Custom')]
    ].forEach(function(choice) { accent.value(choice[0], choice[1]); });
    accent.default = 'orange';

    var custom = section.taboption('appearance', form.Value, 'custom_accent', _('Custom color (hex)'));
    custom.placeholder = '#f59145';
    custom.depends('accent', 'custom');
    custom.validate = function(sectionId, value) {
      return /^#[0-9a-f]{6}$/i.test(value) || _('Enter a color in #RRGGBB format.');
    };

    // Keep the original UCI key so existing preview configurations still work.
    var saturation = section.taboption('appearance', form.Value, 'matrix_intensity', _('Matrix color saturation (%)'),
      _('In dark mode: 0% gives white, 50% gives pale green, and 100% gives vivid Matrix green. Lower values soften the color without dimming the text.'));
    saturation.default = '60';
    saturation.datatype = 'and(uinteger,range(0,100))';
    saturation.depends('accent', 'matrix');
    saturation.placeholder = '60';

    function flag(name, title, description, def) {
      var option = section.taboption('effects', form.Flag, name, title, description);
      option.enabled = 'on';
      option.disabled = 'off';
      option.default = def;
      option.rmempty = false;
      option.retain = true;
      if (name !== 'matrix_fx') option.depends('matrix_fx', 'on');
      return option;
    }

    flag('matrix_fx', _('Enable Matrix effect'),
      _('Works with any accent color. Selecting the Matrix palette does not turn effects on.'), 'off');
    flag('matrix_glow', _('Glow'), _('Add a soft accent glow to headings and controls.'), 'on');
    flag('scanlines', _('Scanlines'), _('Add a subtle CRT texture.'), 'on');

    var area = section.taboption('effects', form.ListValue, 'rain_area', _('Code rain area'));
    area.value('all', _('Everywhere'));
    area.value('main', _('Content only'));
    area.value('chrome', _('Sidebar and top bar'));
    area.value('none', _('No code rain'));
    area.default = 'all';
    area.rmempty = false;
    area.retain = true;
    area.depends('matrix_fx', 'on');

    function slider(name, title, description, min, max, def, unit) {
      var option = section.taboption('effects', form.Value, name, title, description);
      option.default = String(def);
      option.rmempty = false;
      option.retain = true;
      option.datatype = 'and(uinteger,range(' + min + ',' + max + '))';
      ['all', 'main', 'chrome'].forEach(function(value) {
        option.depends({ matrix_fx: 'on', rain_area: value });
      });
      option.renderWidget = function(sectionId) {
        var node = form.Value.prototype.renderWidget.apply(this, arguments);
        var input = node.matches('input') ? node : node.querySelector('input');
        var range = E('input', {
          type: 'range', min: min, max: max, step: 1, value: input.value || def,
          'aria-label': title, 'aria-controls': input.id,
          class: 'termix-effect-range'
        });
        range.disabled = !!(this.readonly != null ? this.readonly : this.map.readonly);
        input.setAttribute('inputmode', 'numeric');
        range.addEventListener('input', function() {
          input.value = range.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        input.addEventListener('input', function() {
          if (input.value !== '' && !isNaN(input.value)) range.value = input.value;
        });
        return E('div', { class: 'termix-effect-slider' }, [range,
          E('div', { class: 'termix-effect-number' }, [node, E('span', {}, unit)])]);
      };
    }

    slider('rain_interval', _('Rain step interval'),
      _('Higher values make the rain slower.'), 40, 250, 100, 'ms');
    slider('rain_size', _('Character size'),
      _('Size of the code rain characters.'), 12, 32, 20, 'px');
    slider('rain_opacity', _('Rain opacity'),
      _('Keep this low so the interface stays easy to read.'), 0, 35, 13, '%');

    return map.render();
  }
});
