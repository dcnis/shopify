(function() {
    let loadScript = function(url, callback){
      let script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = () => callback(script);
      document.head.append(script);
    };
  
    let getMaxDate = function(maxDaysInFuture){
      let result = new Date();
      result.setDate(result.getDate() + maxDaysInFuture);
      return result;
    };
  
    const minimumHours = [
      16, // Sunday
      16, // Monday
      16, // Tuesday
      16, // Wednesday
      16, // Thursday
      12, // Friday
      12, // Saturday
    ];
  
    const minimumMinutes = [
      0, // Sunday
      0, // Monday
      0, // Tuesday
      0, // Wednesday
      0, // Thursday
      0, // Friday
      0, // Saturday
    ];
    
    const maximumHours = [
      22, // Sunday
      22, // Monday
      22, // Tuesday
      22, // Wednesday
      22, // Thursday
      22, // Friday
      22, // Saturday
    ];
  
    const maximumMinutes = [
      0, // Sunday
      0, // Monday
      0, // Tuesday
      0, // Wednesday
      0, // Thursday
      0, // Friday
      0, // Saturday
    ];
  
    let getMinimumHour = function(date){
      return minimumHours[date.getDay()];
    };
  
    let getMinimumMinute = function(date){
      return minimumMinutes[date.getDay()];
    }
  
    let getMaximumHour = function(date){
      return maximumHours[date.getDay()];
    }
  
    let getMaximumMinute = function(date){
      return maximumMinutes[date.getDay()];
    }
  
    /**
     * Get the current minimum time you can select for pickup today based on lead time.
     * Returns false if it's too late in the day to order.
     *
     * @param minimumOrderLeadTimeInMinutes
     * @param timeIntervalInMinutes
     * @returns {false|Date}
     */
    let getMinTimeForToday = function(minimumOrderLeadTimeInMinutes, timeIntervalInMinutes){
      const today = new Date();
      const minimumHour = getMinimumHour(today);
      const minimumMinute = getMinimumMinute(today);
      let result = new Date();
      result.setMinutes(result.getMinutes() + minimumOrderLeadTimeInMinutes);
      result.setMinutes(Math.ceil(result.getMinutes() / timeIntervalInMinutes) * timeIntervalInMinutes);
      if (result.getHours() > getMaximumHour(today) || (result.getHours() === getMaximumHour(today) && result.getMinutes() > getMaximumMinute(today))) {
        // it's too late in the day to order
        return false;
      }
      if (result.getHours() < minimumHour || (result.getHours() === minimumHour && result.getMinutes() < minimumMinute)) {
        result.setHours(minimumHour);
        result.setMinutes(minimumMinute);
      }
      return result;
    };
  
    let getTomorrow = function(){
      let result = new Date();
      result.setDate(result.getDate() + 1);
      return result;
    };
  
    let initializePicker = function($){
      const disabledDays = [2]; // Sunday, Monday
      const maxDaysInFuture = 7;
      const minimumOrderLeadTimeInMinutes = 30;
      const blackoutDates = [];
      const timeIntervalInMinutes = 15;
      const minTimeForToday = getMinTimeForToday(minimumOrderLeadTimeInMinutes, timeIntervalInMinutes);
  
      const $appInput = $('#lsd-restaurant-pickup-app');
      const $appButton = $('#lsd-restaurant-pickup-app-btn');
      const $timePicker = $('input[name="attributes[Bestimmte-Zeit]"]').pickatime({
        format: 'HH:i',
        formatLabel: 'HH:i U!hr',
        interval: timeIntervalInMinutes,
        clear: 'zurücksetzen',
        onSet: function(context) {
          if ($datePicker.pickadate('picker').get() && $timePicker.pickatime('picker').get()) {
            $appInput.val($datePicker.pickadate('picker').get() + ' at ' + $timePicker.pickatime('picker').get());
            $validator.resetForm();
          } else {
            $appInput.val('');
          }
        }
      });
      const $datePicker = $('input[name="attributes[Bestimmtes-Datum]"]').pickadate({
        format: 'dddd, dd mmm, yyyy',
        formatSubmit: 'dddd dd mmm yyyy', // can parse with moment(str, 'dddd dd mmm yyyy')
        today: '',
        monthsFull: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        monthsShort: ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'],
          weekdaysShort: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
        weekdaysFull: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        clear: 'zurücksetzen',
        close: '',
        min: new Date(),
        max: getMaxDate(maxDaysInFuture),
        disable: [...disabledDays, ...blackoutDates],
        hiddenName: true,
        onSet: function(context) {
          // context gives select: with the timestamp in MS of the date selected
          if (context.select) {
            const selectedDate = new Date(context.select);
            const today = new Date();
  
            $timePicker.pickatime('picker').clear();
            if (selectedDate.getDate() === today.getDate() && selectedDate.getMonth() === today.getMonth()) {
              // limit time to only in future + lead time
              // we assume there are times because we disable selecting today if there are none
              $timePicker.pickatime('picker').set('min', [minTimeForToday.getHours(), minTimeForToday.getMinutes()]);
              $timePicker.pickatime('picker').set('max', [getMaximumHour(selectedDate), getMaximumMinute(selectedDate)]);
            } else {
              // show all available times
              $timePicker.pickatime('picker').set('min', [getMinimumHour(selectedDate), getMinimumMinute(selectedDate)]);
              $timePicker.pickatime('picker').set('max', [getMaximumHour(selectedDate), getMaximumMinute(selectedDate)]);
            }
  
            $timePicker.pickatime('picker').open();
          }
        }
      });
  
      const $validator = $('form.cart').validate({
        messages: {
          'lsd-restaurant-pickup-app': 'Please select a preferred pickup date/time'
        },
      });
  
      const handleAppClick = function(event){
        event.stopPropagation();
        event.preventDefault();
  
        const today = new Date();
  
        // if it's too late in the day to order, don't let today be a valid date to select
        if (minTimeForToday === false) {
          $datePicker.pickadate('picker').set('min', getTomorrow());
        } else {
          $datePicker.pickadate('picker').set('min', today);
        }
  
        $validator.resetForm();
  
        $datePicker.pickadate('picker').open();
      };
  
      $appInput.on('click', handleAppClick);
      $appButton.on('click', handleAppClick);
      
      
      const $dateTimePicker = $('#datetimepicker-wrapper');
      $dateTimePicker.prop('hidden', true);
    };
    
    let deactivePickerIfSofortigeLieferung = function($){
      
      const $lieferart = $('input[name="attributes[Lieferart]"]');
  
      $lieferart.on('click', function(event){
        
        // Zeige Radiobuttons attributes[Lieferzeit] an
        const $lieferzeit_wrapper = $('#lieferzeit-wrapper');
        $lieferzeit_wrapper.prop('hidden', false);
        
        const $lieferzeit_radiobutton = $('input[name="attributes[Lieferzeit]"]');
        
        $lieferzeit_radiobutton.on('click', function(event){
        
            // enable Checkout Button
            const $checkoutButton = $('input[name="checkout"]');  
            $checkoutButton.prop('disabled', false);    

        const $dateTimePicker = $('#datetimepicker-wrapper');
        
          console.log(event.target.id);
        if(event.target.id === 'radio_asap'){
          $dateTimePicker.prop('hidden', true);
        } else {
          $dateTimePicker.prop('hidden', false);
        }
        
      });
  
      });
    
    };
  
    let lsdAppJavaScript = function($){
      $(document).ready(function() {
        if (typeof $('#lsd-restaurant-pickup-app').pickadate === 'undefined') {
          console.log('loading picker');
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.6.4/picker.js', function(){
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.6.4/picker.date.js', function(){
              loadScript('https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.6.4/picker.time.js', function(){
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.19.1/jquery.validate.min.js', function(){
                  initializePicker($);
                  deactivePickerIfSofortigeLieferung($);
                });
              });
            });
          });
        } else {
          initializePicker($);
          deactivePickerIfSofortigeLieferung($);
        }
      });
    };
  
    window.onload = function() {
      if ((typeof window.jQuery === 'undefined') || parseInt(window.jQuery.fn.jquery) < 2 || (parseInt(window.jQuery.fn.jquery) === 1 && parseFloat(window.jQuery.fn.jquery.replace(/^1\./,'')) < 7.1)) {  
        loadScript('//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', function(){
          lsdAppJavaScript(window.jQuery);
        });
      } else {
          lsdAppJavaScript(window.jQuery);
      }
    }
  })();