(function($, window, document) {
  var color = '008887';
  var fontcolor = 'ffffff';
  var fileBeingActedUponId = '';
  var directoryLock = '';
  var url = OC.generateUrl('/apps/w2g2/lock');
  var checkStateUrl = OC.generateUrl('/apps/w2g2/lock');
  var directoryLockUrl = OC.generateUrl('/apps/w2g2/directory-lock');
  var colorUrl = OC.generateUrl('/apps/w2g2/color');
  var lockstate = t('w2g2', 'Locked');

  $(document).ready(function() {
    getBackgroundColor();
    getFontColor();
    getDirectoryLockStatus();

    if (typeof FileActions !== 'undefined' && $('#dir').length > 0) {
      OCA.Files.fileActions.registerAction({
        name: 'getstate_w2g',
        displayName: '',
        mime: 'all',
        permissions: OC.PERMISSION_ALL,
        type: OCA.Files.FileActions.TYPE_INLINE,
        icon: function() {
          return OC.imagePath('w2g2', 'lock.png');
        },
        actionHandler: function(filename, context) {
          toggleLock(filename, context.$file);
        }
      });

      filesLockStateCheck();
    }

    buildCSS();

    window.fileHelper = new FileHelper();
    window.fileUI = new UI();
  });

  function filesLockStateCheck() {
    var files = [];

    //Walk through all files in the active Filelist
    $('#content').delegate('#fileList', 'fileActionsReady', function(event) {
      for (var i = 0; i < event.$files.length; i++) {
        var file = event.$files[i][0];
        var $file = $(file);

        if ($file && $file.hasOwnProperty('context')) {
          files.push([
            $file.attr('data-id'),
            $file.attr('data-file'),
            $file.attr('data-share-owner'),
            '',
            $file.attr('data-mounttype'),
            $file.attr('data-type')
          ]);
        }
      }

      if (files.length > 0) {
        getLockStateForFiles(files);

        files = [];
      }
    });
  }

  /**
   * Toggle the 'lock' state for the given file.
   *
   * @param fileName
   * @param $file
   */
  function toggleLock(fileName, $file) {
    var id = $file.attr('data-id');
    var fileType = $file.attr('data-type');

    // Block any 'lock' or 'unlock' actions on this file until the current one is finished.
    if (fileBeingActedUponId === id) {
      return;
    }

    // Set the current file as being acted upon to block any future action until the current one is finished.
    fileBeingActedUponId = id;

    // Show 'loading' message on the UI
    fileUI.showLoading(id);

    if (fileHelper.isLocked($file)) {
      unlockFile(id, fileType);

      return;
    }

    lockFile(id, fileType);
  }

  function lockFile(id, fileType) {
    var data = {
      id: id,
      fileType: fileType
    };

    $.ajax({
      url: url,
      type: 'post',
      data: data,
      success: function(data) {
        onLockSuccess(id, data['message']);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        onLockError(id, jqXHR.responseJSON.message);
      }
    });
  }

  function unlockFile(id, fileType) {
    var data = {
      id: id,
      fileType: fileType
    };

    $.ajax({
      url: url,
      type: 'delete',
      data: data,
      success: function(data) {
        onUnlockSuccess(id, data['message']);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        onUnlockError(id, jqXHR.responseJSON.message);
      }
    });
  }

  function onLockSuccess(id, message) {
    fileUI.locked(id, message);
    $('td.selection.statelock')
      .find('label')
      .hide();
    $('td.selection.statelock')
      .find('input.selectCheckBox')
      .remove();
    fileBeingActedUponId = '';
  }

  function onLockError(id, message) {
    fileUI.lockedError(id, message);

    fileBeingActedUponId = '';
  }

  function onUnlockSuccess(id, message) {
    fileUI.unlocked(id, message);
    $('td.selection')
      .find('label')
      .show();
    fileBeingActedUponId = '';
  }

  function onUnlockError(id, message) {
    fileUI.unlockedError(id, message);

    fileBeingActedUponId = '';
  }

  /**
   * Check the 'lock' state of the given files.
   *
   * @param files
   */
  function getLockStateForFiles(files) {
    oc_dir = $('#dir').val();

    if (oc_dir !== '/') {
      oc_dir += '/';
    }

    var data = {
      files: JSON.stringify(files),
      folder: escapeHTML(oc_dir)
    };

    $.ajax({
      url: checkStateUrl,
      type: 'get',
      data: data,
      success: function(data) {
        updateAllFilesUI(data);
      }
    });
  }

  function updateAllFilesUI(files) {
    for (var i = 0; i < files.length; i++) {
      var id = files[i][0];
      var message = files[i][3];

      // if (fileType === 'dir' && directoryLock === 'directory_locking_none') {
      //     return;
      // }

      if (message) {
        onLockSuccess(id, message);
      }
    }
  }

  function removeLinksFromLockedDirectories() {
    var $namelock = $('a.namelock');

    $namelock.removeAttr('href');
  }

  function getBackgroundColor() {
    $.ajax({
      url: colorUrl,
      type: 'get',
      data: { type: 'color' },
      async: false,
      success: function(data) {
        if (data != '') {
          color = data;
        }
      }
    });
  }

  function getFontColor() {
    $.ajax({
      url: colorUrl,
      type: 'get',
      data: { type: 'fontcolor' },
      async: false,
      success: function(data) {
        if (data != '') {
          fontcolor = data;
        }
      }
    });
  }

  function getDirectoryLockStatus() {
    $.ajax({
      url: directoryLockUrl,
      type: 'get',
      data: {},
      async: false,
      success: function(data) {
        if (data !== '') {
          directoryLock = data;
        }
      }
    });
  }

  function buildCSS() {
    var cssrules = $("<style type='text/css'> </style>").appendTo('head');

    cssrules.append(
      '.statelock { background-color: #' +
        color +
        ' !important; color:#' +
        fontcolor +
        ' !important;}' +
        '.statelock span.modified{color:#' +
        fontcolor +
        ' !important;}' +
        'a.w2g_active{color:#' +
        fontcolor +
        ' !important;display:inline !important;opacity:1.0 !important;}' +
        'a.w2g_active:hover{color:#fff !important;}' +
        'a.namelock,a.namelock span.extension {color:#' +
        fontcolor +
        ';opacity:1.0!important;padding: 0 !important;}'
    );
  }

  function FileHelper() {
    this.getById = function(id) {
      return $('tr[data-id=' + id + ']');
    };

    this.isLocked = function($file) {
      return parseInt($file.data().locked) === 1;
    };
  }

  function UI() {
    this.locked = function(id, message) {
      var $file = fileHelper.getById(id);

      this.setMessage($file, message);

      $file.data('locked', 1);

      var actionName = 'getstate_w2g';

      $('.ignore-click').unbind('click');

      $file
        .find('a.permanent[data-action!=' + actionName + ']')
        .removeClass('permanent');
      $file
        .find('a.action[data-action=' + actionName + ']')
        .addClass('w2g_active');
      $file
        .find(
          'a.action[data-action!=' + actionName + ']:not([class*=favorite])'
        )
        .addClass('locked');
      $file
        .find('a.name')
        .addClass('namelock')
        .removeClass('name')
        .addClass('ignore-click');

      var $fileSize = $file.find('td.filesize');
      var $date = $file.find('td.date');

      $fileSize.click(function() {
        return false;
      });

      $date.click(function() {
        return false;
      });

      $file.find('td').addClass('statelock');

      $('.ignore-click').click(function(event) {
        event.preventDefault();

        return false;
      });

      $file.find('a.name').on('click', function(event) {
        event.preventDefault();

        return false;
      });
    };

    this.unlocked = function(id, message) {
      var $file = fileHelper.getById(id);

      this.setMessage($file, message);

      var $file = fileHelper.getById(id);

      $file.data('locked', 0);

      $('.ignore-click').unbind('click');

      var actionName = 'getstate_w2g';

      $file
        .find('a.action[data-action!=' + actionName + ']')
        .removeClass('locked');
      $file
        .find('a.action[data-action!=' + actionName + ']')
        .addClass('permanent');
      $file
        .find('a.action[data-action=' + actionName + ']')
        .removeClass('w2g_active');
      $file
        .find('a.namelock')
        .addClass('name')
        .removeClass('namelock')
        .removeClass('ignore-click');

      var $fileSize = $file.find('td.filesize');
      var $date = $file.find('td.date');

      $fileSize.unbind('click');
      $date.unbind('click');

      $file.find('td').removeClass('statelock');
      $file.find('a.statelock').addClass('name');

      $('.ignore-click').click(function(event) {
        event.preventDefault();

        return false;
      });
    };

    this.lockedError = function(id, message) {
      var $file = fileHelper.getById(id);

      this.setMessage($file, message);
    };

    this.unlockedError = function(id, message) {
      var $file = fileHelper.getById(id);

      this.setMessage($file, message);
    };

    this.setMessage = function($file, message) {
      var html =
        '<img class="svg" src="' +
        OC.imagePath('w2g2', 'lock.png') +
        '"></img>' +
        '<span>' +
        escapeHTML(message) +
        '</span>';

      $file.find('.fileactions .action-getstate_w2g').html(html);
    };

    this.showLoading = function(id) {
      var html =
        '<img class="svg" src="' +
        OC.imagePath('w2g2', 'loading.png') +
        '"></img>' +
        '<span> In progress </span>';

      var $file = fileHelper.getById(id);

      $file.find('.fileactions .action-getstate_w2g').html(html);
    };
  }
})($, window, document);
