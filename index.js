/**
 * Dateranger
 *
 * It's based on 4 (text) inputs to be able to enter them by hand.
 * It was like that at the start, & it's still like that on touch device
 * because it"s not convenient to use the datepicker on touch device (well native datepicker are more convenient)
 *
 */
(function (root, factory) {
    "use strict";

    var moment // mandatory
      , pikaday // optional
    if (typeof exports === "object") {
      // CommonJS module
      moment = require("moment")
      try { pikaday = require("pikaday"); } catch (e) {}
      module.exports = factory(moment, pikaday)
    }
    else if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(function (req) {
        return factory(req("moment"), req.defined && req.defined("pikaday") ? req("pikaday") : undefined)
      })
    }
    else {
      root.DateRanger = factory(root.moment, root.Pikaday)
    }
}(this, function (moment, Pikaday) {
  "use strict";

  /**
   * Private functions
   */
  var createElement = function(options) {
      var el
        , a
        , i
      if (!options.tagName) {
        el = document.createDocumentFragment()
      }
      else {
        el = document.createElement(options.tagName)
        if (options.className) {
          el.className = options.className
        }

        if (options.attributes) {
          for (a in options.attributes) {
            el.setAttribute(a, options.attributes[a])
          }
        }

        if (options.html !== undefined) {
          el.innerHTML = options.html
        }
      }

      if (options.text) {
        el.appendChild(document.createTextNode(options.text))
      }

      // IE 8 doesn"t have HTMLElement
      if (window.HTMLElement === undefined) {
        window.HTMLElement = Element
      }

      if (options.childs && options.childs.length) {
        for (i = 0; i < options.childs.length; i++) {
          el.appendChild(options.childs[i] instanceof window.HTMLElement ? options.childs[i] : createElement(options.childs[i]))
        }
      }

      return el
    }

  , trigger = function(el, e) {
      verbose("trigger", e, el)
      var event
      if (document.createEvent) {
        event = document.createEvent("HTMLEvents")
        event.initEvent(e, true, true)
      }
      else {
        event = document.createEventObject()
        event.eventType = e
      }

      event.eventName = e

      if (document.createEvent) {
        el.dispatchEvent(event)
      }
      else {
        el.fireEvent("on" + event.eventType, event)
      }
    }

  , merge = function (target, src) {
      var array = Array.isArray(src)
      var dst = array && [] || {}

      if (target && typeof target === 'object') {
        Object.keys(target).forEach(function (key) {
          dst[key] = target[key]
        })
      }
      Object.keys(src).forEach(function (key) {
        if (typeof src[key] !== 'object' || !src[key]) {
          dst[key] = src[key]
        }
        else {
          // if (!target[key]) {
            dst[key] = src[key]
          // }
          // else {
          //   dst[key] = merge(target[key], src[key])
          // }
        }
      })

      return dst
    }

  , verbose = function() {
      if (DateRanger.verbose && console) {
        if (typeof console.log === 'function') {
          console.log.apply(console, arguments);
        }
        // ie is weird
        else if (console.log) {
          console.log(arguments);
        }
      }
    }

  , Storage = function() {
      this.engine = window.localStorage
    }

  , defaults = {
      id: "0"
    , ranges: [{
        label: ""
      , max: moment()
      , min: null
      , preselected: "lastMonth"
      , predefinedMethods: {
          today: function() {
            this.setDates(0, moment().format(this.inputDateFormat))
            this.predefinedSelected()
          }
        , yesterday: function() {
            this.setDates(0, moment().subtract("days", 1).format(this.inputDateFormat))
            this.predefinedSelected()
          }
          // from last Monday to last Sunday
        , lastWeek: function() {
            // 0 = current sunday
            this.setDates(0, moment().weekday(-7), moment().weekday(-1))
            this.predefinedSelected()
          }
          // from the first of last month until the last day of that month
        , lastMonth: function() {
            this.setDates(0, moment().subtract("months", 1).date(1), moment().date(1).subtract("days", 1))
            this.predefinedSelected()
          }
          // from January 1st of this year until today
        , yearToDate: function() {
            this.setDates(0, moment().dayOfYear(1), this.options.ranges[0].max[0])
            this.predefinedSelected()
          }
        }
      }
      // , {
      //     label: "Compare to"
      //   , max: function() {
      //       return (this.getEndDate(0) ? moment(this.getEndDate(0)) : moment()).format(this.options.htmlDateFormat)
      //     }
      //   , min: null
      //   , preselected: "previousPeriod"
      //   , predefinedMethods: {
      //       // the exact amount of time previous
      //       previousPeriod: function() {
      //         if (this.getStartDate(0) && this.getEndDate(0)) {
      //           var observeDiffInDays = Math.abs(moment(this.getStartDate(0)).diff(this.getEndDate(0), "days"))
      //           verbose("observeDiffInDays", observeDiffInDays)
      //           this.setEndDate(1, moment(this.getStartDate(0)).subtract("days", 1).format(this.inputDateFormat))
      //           this.setStartDate(1, moment(this.getStartDate(0)).subtract("days", 1 + observeDiffInDays).format(this.inputDateFormat))
      //         }
      //         else {
      //           this.setEndDate(1, null)
      //           this.setStartDate(1, null)
      //         }
      //       }
      //       // the same time period in the previous year
      //     , previousYear: function() {
      //         if (this.getStartDate(0) && this.getEndDate(0)) {
      //           this.setEndDate(1, moment(this.getEndDate(0)).subtract("year", 1).format(this.inputDateFormat))
      //           this.setStartDate(1, moment(this.getStartDate(0)).subtract("year", 1).format(this.inputDateFormat))
      //         }
      //         else {
      //           this.setEndDate(1, null)
      //           this.setStartDate(1, null)
      //         }
      //       }
      //     }
      //   }
      ]
    , displayDateFormat: "MMM D, YYYY"
    , htmlDateFormat: "YYYY-MM-DD"
    , i18n: {
        from: "From "
      , to: "To "
      , pleaseChooseADateRange: "Please choose a date range"
      , invalidDate: "Invalid date"
      , today: "Today"
      , yesterday: "Yesterday"
      , lastWeek: "Last Week"
      , lastMonth: "Last Month"
      , yearToDate: "Year to Date"
      , previousPeriod: "Previous period"
      , previousYear: "Previous year"
      , custom: "Custom Range"
      }
    // if !touch && input date supported
    // we just reset to text to get control over the datepicker
    // this is to stick with native datepicker for tablet & phone :)
    //customDatepicker: !(Modernizr.touch && Modernizr.inputtypes.date)
    , customDatepicker: true
    , datepicker: {
        // dont use pikaday field options
        // using this will create a bad cirular reference when changing value in the input text
        // onchange triggered, datepicker setDate, retrigger onchange...
        // field: elInput,
        // defaultDate: elInput.value,
        // setDefaultDate: true,
        // bound: false,
        numberOfMonths: 2
      , i18n: {
          previousMonth : "Previous Month"
        , nextMonth     : "Next Month"
        , months        : ["January","February","March","April","May","June","July","August","September","October","November","December"]
        , weekdays      : ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        , weekdaysShort : ["S","M","T","W","T","F","S"]
        }
      }
    , Storage: Storage
     }

  , DateRanger = function(opts) {
      var i
        , j

      this.options = merge(defaults, opts || {})

      this.storage = new this.options.Storage()

      this.valuesInitialized = false
      this.errorState = false
      this.errors = []
      this.currentMethodName  = []
      this.ranges = []

      for (i = 0; i < this.options.ranges.length; i++) {
        this.ranges[i] = {}
        this.ranges[i].predefinedMethods = {}
        Object.keys(this.options.ranges[i].predefinedMethods).forEach(function(key) {
           this.ranges[i].predefinedMethods[key] = this.options.ranges[i].predefinedMethods[key].bind(this)
        }, this)

        ;["min", "max"].forEach(function(m) {
          if (!(this.options.ranges[i][m] instanceof Array)) {
            this.options.ranges[i][m] = [this.options.ranges[i][m], this.options.ranges[i][m]]
          }
          this.options.ranges[i][m].forEach(function(mValue) {
            if (typeof mValue === "function") {
              this.options.ranges[i][m] = mValue.bind(this)
            }
          }, this)
        }, this)
      }

      this.render()

      if (!this.options.customDatepicker) {
        // using native input date require RFC3339 date format
        this.inputDateFormat = this.htmlDateFormat
      }
      else {
        // we dont care to respect html5 input date format
        this.inputDateFormat = this.options.displayDateFormat

        this.renderDatepickers()
      }

      for (i = 0; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          var dateIndex = i
          this.ranges[i].elInputs[j].addEventListener("change", function() {
            verbose("input change", dateIndex)
            this.currentMethodName[dateIndex] = "custom"
            this.el.classList.add("DateRanger--customRange")
          }.bind(this))
          this.ranges[i].elInputs[j].addEventListener("change", this.updateDates.bind(this))
        }
      }
      this.elButton.addEventListener("click", this.toggle.bind(this))
      this.elButtonApply.addEventListener("click", this.apply.bind(this))
      this.elButtonCancel.addEventListener("click", this.cancel.bind(this))
      this.focusOutsideCancelChanges()

      this.restoreDates()
      if (!this.updateDates()) {
        this.open()
      }
      //this.id = "DateRanger" + (new Date().getTime())
    }

  Storage.prototype = {
    get: function(key) {
      var value = this.engine.getItem("DateRanger." + key)
      try {
        value =  JSON.parse(value)
      }
      catch (e) {}

      return value
    }

  , set:  function(key, value) {
      if (typeof value === "object") {
        value =  JSON.stringify(value)
      }
      this.engine.setItem("DateRanger." + key, value)
    }
  }

  DateRanger.verbose = false

  /**
   * public DateRanger API
   */
  DateRanger.prototype = {
    render: function() {
      this.renderButton()
      this.renderBody()

      // body
      this.renderRanges()
      this.elBody.appendChild(this.elRanges)
      this.renderPredefined()
      this.elBody.appendChild(this.elPredefined)

      this.renderActionButtons()
      this.elBody.appendChild(this.elActionButtons)

      this.el = createElement({
        tagName: "div"
      , className: "DateRanger DateRanger--" + this.options.id
      , childs: [this.elButton, this.elBody]
      })
    }

  , renderButton: function() {
      this.elButtonText = createElement({
        tagName: "span"
      , className: "DateRanger-button-textRange"
      })

      this.elButton = createElement({
        tagName: "button"
      , className: "DateRanger-button"
      , childs: [{
            tagName: "i"
          , className: "DateRanger-button-icon DateRanger-button-icon--calendar"
          }
        , this.elButtonText
        , {
            tagName: "i"
          , className: "DateRanger-button-icon DateRanger-button-icon--toggle"
        }]
      })
    }

  , renderActionButtons: function() {
      // ok button
      this.elButtonApply = createElement({
          tagName: "button"
        , className: "DateRanger-button DateRanger-actionButton DateRanger-applyButton"
        , text: "Apply"
      })

      // cancel button
      this.elButtonCancel = createElement({
          tagName: "button"
        , className: "DateRanger-button DateRanger-actionButton DateRanger-cancelButton"
        , text: "Cancel"
      })

      this.elActionButtons = createElement({
          tagName: "div"
        , className: "DateRanger-actionButtons"
        , childs: [this.elButtonApply, this.elButtonCancel]
      })
  }

  , renderBody: function() {
      this.elBody = createElement({
        tagName: "div"
      , className: "DateRanger-body"
      , childs: [
        ]
      })
    }

  , renderRange: function(options) {
      var range = {
        elRange: createElement({
          tagName: "div"
          , className: "DateRanger-range"
        })
      }

      if (options.label) {
        range.elTitle = createElement({
          tagName: "div"
        , className: "DateRanger-range-title"
        , text: options.label
        })
        range.elRange.appendChild(range.elTitle)
      }

      // labels
      range.elLabels = [
        createElement({
          tagName: "label"
          , className: "DateRanger-label DateRanger-range-label DateRanger-range-label--start"
          , childs: [{
            tagName: "span"
            , className: "DateRanger-label-text DateRanger-range-label-text DateRanger-range-label-text--start"
            , text: this.options.i18n.from
          }]
        }),
        createElement({
          tagName: "label"
          , className: "DateRanger-label DateRanger-range-label DateRanger-range-label--end"
          , childs: [{
            tagName: "span"
            , className: "DateRanger-label-text DateRanger-range-label-text DateRanger-range-label-text--end"
            , text: this.options.i18n.to
          }]
        })
      ]
      range.elRange.appendChild(range.elLabels[0])
      range.elRange.appendChild(range.elLabels[1])

      // input inside labels
      range.elInputs = [
        createElement({
          tagName: "input"
          , className: "DateRanger-input DateRanger-range-input DateRanger-range-input--start"
          , attributes: { type: "date" }
        })
      , createElement({
          tagName: "input"
          , className: "DateRanger-input DateRanger-range-input DateRanger-range-input--end"
          , attributes: { type: "date" }
        })
      ]

      range.elLabels[0].appendChild(range.elInputs[0])
      range.elLabels[1].appendChild(range.elInputs[1])

      return range
    }

  , renderRanges: function() {
      this.elRanges = createElement({
        tagName: "div"
      , className: "DateRanger-ranges"
      })

      this.options.ranges.forEach(function(options, i) {
        this.ranges[i] = merge(this.ranges[i], this.renderRange(options))
        this.elRanges.appendChild(this.ranges[i].elRange)
      }, this)
    }

  , renderPredefined: function() {
      var i
        , j

      this.elPredefined = createElement({
        tagName: "div"
      , className: "DateRanger-predefined"
      })

      this.elPredefinedBtns = []
      for (i = 0; i < this.ranges.length; i++) {
        var el = createElement({
            tagName: "div"
          , className: "DateRanger-buttons"
          , childs: this.ranges[i].label ? [{
            tagName: "div"
            , className: "DateRanger-button DateRanger-predefined-button-title DateRanger-predefined-button-title--" + i
            , text: this.options.i18n[this.ranges[i].label]
          }] : []
        })
        this.elPredefinedBtns[i] = {}
        Object.keys(this.ranges[i].predefinedMethods).forEach(function(key) {
          var cb = this.ranges[i].predefinedMethods[key]
            , elButton = createElement({
                tagName: "button"
              , className: "DateRanger-button DateRanger-button--" + i + " DateRanger-predefined-button DateRanger-predefined-button--" + i
              , text: this.options.i18n[key]
              })
            , rangeIndex = i
          elButton.addEventListener("click", (function() {
            this.currentMethodName[rangeIndex] = key
            verbose("predefined for range", rangeIndex, ":", key)
            cb()
            this.updateDates()
          }).bind(this))
          this.elPredefinedBtns[i][key] = elButton
          el.appendChild(this.elPredefinedBtns[i][key])
        }, this)
        this.elPredefined.appendChild(el)
      }
    }

  , open: function(focusFirstDate) {
      focusFirstDate = focusFirstDate || true
      this.el.classList.add("DateRanger--isOpen")
      if (focusFirstDate) {
        this.ranges[0].elInputs[0].focus()
        this.ranges[0].elInputs[1].pikaday.draw()
      }
    }

  , close: function() {
      if (!this.isInvalid()) {
        this.el.classList.remove("DateRanger--isOpen")
      }
    }

  , isOpen: function() {
      return this.el.classList.contains("DateRanger--isOpen")
    }

  , toggle: function() {
      this[ this.isOpen() ? "close" : "open"]()
    }

  , focusOutsideCancelChanges: function() {
      // if click outside the selector, toggle visibility
      document.documentElement.addEventListener("click", (function() {
        if (this.el.classList.contains("DateRanger--isOpen")) {
          this.cancel()
        }
      }).bind(this))
      // just be sure that click selector won"t trigger outside doc click
      this.el.addEventListener("click", function(event) { event.stopPropagation() })
   }

  , isInvalid: function() {
      return this.errorState
    }

    // getter/setter
  , getOrSetInputDate: function(input, value) {
      // get
      if (value === undefined) {
        return input.value ? moment(input.value, this.inputDateFormat).format(this.htmlDateFormat) : null
      }

      // set
      verbose("set", input, value)
      if (value === null || value === "" ) {
        input.value = ""
        if (input.pikaday) {
          input.pikaday.setDate(null)
        }
      }
      else {
        var date = moment(value)
        if (!date.isValid()) {
          if (!this.isInvalid()) {
            this.addError(this.options.i18n.invalidDate)
          }

          return false
        }

        // here we don"t force value as a htmlDateFormat
        // this allow flexible setting
        // if it bring some bug, just add this.htmlDateFormat as moment format,
        // and delete TRICK
        input.value = date.format(this.inputDateFormat)
        if (input.pikaday) {
          input.pikaday.setMoment(date, true)
          if (input.pikaday.isVisible()) {
            input.pikaday.draw(true)
          }
        }
      }
    }

  , getDate: function(rangeIndex, dateIndex) {
      return this.getOrSetInputDate(this.ranges[rangeIndex].elInputs[dateIndex])
    }

  , getStartDate: function(rangeIndex) {
      return this.getDate(rangeIndex, 0)
    }

  , getEndDate: function(rangeIndex) {
      return this.getDate(rangeIndex, 1)
    }

  , setDate: function(rangeIndex, dateIndex, value) {
      return this.getOrSetInputDate(this.ranges[rangeIndex].elInputs[dateIndex], value)
    }

  , setStartDate: function(rangeIndex, value) {
      return this.setDate(rangeIndex, 0, value)
    }

  , setEndDate: function(rangeIndex, value) {
      return this.setDate(rangeIndex, 1, value)
    }

  , setDates: function(rangeIndex, start, end) {
      verbose("set start date", rangeIndex, start, end)
      this.setStartDate(rangeIndex, start)
      this.setEndDate(rangeIndex, end !== undefined ? end : start)

      // switch dates if there are not setup in the right order
      // (eg copy & bad paste)
      if (this.getEndDate(rangeIndex) && moment(this.getStartDate(rangeIndex), this.htmlDateFormat).diff(moment(this.getEndDate(rangeIndex), this.htmlDateFormat)) > 0) {
        verbose("switch", rangeIndex)
        var switchDate = this.getEndDate(rangeIndex)
        this.setEndDate(rangeIndex, this.getStartDate(rangeIndex))
        this.setStartDate(rangeIndex, switchDate)
      }
    }

  , addError: function(error) {
      this.errorState = true
      window.alert(error)
      //this.errors.push(notifier.error(error))
    }

  , resetErrors: function() {
      this.errorState = false
      // this.errors.forEach(function(error) {
      //   error.close()
      // })
      this.errors = []
    }

    // try to trigger change event to notify observers
  , triggerUpdate: function() {
      var i
      for (i = 0; i < this.ranges.length; i++) {
        if (!(this.getStartDate(i) && this.getEndDate(i))) {
          this.addError(this.options.i18n.pleaseChooseADateRange)
          return false
        }
      }

      // we compare to previous saved dates to check if there is a real change
      // to know if we need to trigger a change event or not
      var previousDates = JSON.stringify(this.storage.get("dates"))
      this.saveDates()
      var currentDates = JSON.stringify(this.storage.get("dates"))
      if (currentDates !== previousDates) {
        verbose("Dates changed & saved")
        for (i = 0; i < this.ranges.length; i++) {
          this.storage.set("dates." + this.options.id + ".method-" + i, this.currentMethodName[i])
        }

        var dates = []
        for (i = 0; i < this.ranges.length; i++) {
          dates.push([this.getStartDate(i), this.getEndDate(i)])
        }

        this.options.onChange(dates)
      }

      return true
    }

  , updateDates: function() {
      var i
      if (this.valuesInitialized) {
        verbose("updateDates")
        this.resetErrors()

        for (i = 0; i < this.ranges.length; i++) {
          this.setDates(i, this.ranges[i].elInputs[0].value, this.ranges[i].elInputs[1].value)
        }
        verbose("No error in the dates format, lets proceed to dates range check")

        this.updateConstraintes()

        // for (i = 0; i < this.ranges.length; i++) {
        //   verbose("Auto update others ranges if needed", i, this.isCustomRange(i))
        //   if (!this.isCustomRange(i)) {
        //     this.ranges[i].predefinedMethods[this.currentMethodName[i]]()
        //   }
        // }

        // Update buttons states
        this.updateButtonState()

        // update text button
        this.updateTextRange()
      }

      return true
    }

    ////
    // updateDatesConstraintes
    //
    // we use html 5 input date attributes to make it compatible with native input date
    // http://www.w3.org/TR/html-markup/input.date.html
  , updateConstraintes: function() {
      var i
        , j
      for (i = 0; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          var max = this.options.ranges[i].max[j]
            , min = this.options.ranges[i].min[j]
          max = (typeof max === "function") ? max() : max
          if (max) {
            this.ranges[i].elInputs[j].setAttribute("max", max.format(this.options.htmlDateFormat))
            if (this.ranges[i].elInputs[j].value && moment(this.ranges[i].elInputs[j].value, this.inputDateFormat).diff(max) > 0) {
              this.setDate(i, j, max)
            }
          }

          min = (typeof min === "function") ? min() : min
          if (min) {
            this.ranges[i].elInputs[j].setAttribute("min", min.format(this.options.htmlDateFormat))
            if (this.ranges[i].elInputs[j].value && moment(this.ranges[i].elInputs[j].value, this.inputDateFormat).diff(min) > 0) {
              this.setDate(i, j, max)
            }
          }
        }
      }

      verbose("Constraints updated")

      // just copy html5 attribs as customDatepicker value, only if attributes are present
      if (this.options.customDatepicker) {
        for (i = 0; i < this.ranges.length; i++) {
          for (j = 0; j < 2; j++) {
            this.setCustomDatepickerConstraints(i, j)
          }
        }

        verbose("Constraints updated for the custom datepicker")
      }
    }

  , updateButtonState: function() {
      var i
        , j
      for (i = 0; i < this.ranges.length; i++) {
        Object.keys(this.elPredefinedBtns[i]).forEach(function(key) {
          var el = this.elPredefinedBtns[i][key]
          el.classList.remove("DateRanger-button--selected")
          el.classList.remove("DateRanger-predefined-button--selected")
          // Object.keys(this.ranges[i].predefinedMethods).forEach(function(key) {
            console.log(el, this.currentMethodName[i], key)
            if (this.currentMethodName[i] === key) {
              el.classList.add("DateRanger-button--selected")
              el.classList.add("DateRanger-predefined-button--selected")
            }
          // }, this)
        }, this)
      }
      verbose("Buttons states updated")
    }

    // use first range to create a button label
  , updateTextRange: function() {
        this.elButtonText.innerHTML =
          this.ranges[0].elInputs[0].value !== this.ranges[0].elInputs[1].value ?
            this.ranges[0].elInputs[0].value + " - " + this.ranges[0].elInputs[1].value :
            this.ranges[0].elInputs[0].value
    }

  , apply: function() {
      if (this.updateDates()) {
        if (this.triggerUpdate()) {
          this.close()
        }
      }
    }

  , cancel: function() {
      this.restoreDates()
      this.apply()
      this.resetDatepickersState()
      this.updateTextRange()
    }

  , isCustomRange: function(rangeIndex) {
      return this.currentMethodName[rangeIndex] === "custom"
    }

  , initializeDatepicker: function(i) {
      var datepicker = new Pikaday(merge(this.options.datepicker, { format: this.inputDateFormat }))
      datepicker._o.onDraw = this.enhanceDatepickerWithVisibleRanges.bind(this, datepicker)
      datepicker.el.classList.add("DateRanger-datepicker--range" + i)

      return datepicker
    }

  , renderDatepickers: function() {
      var i
        , j
        , that = this
      this.elDatepickers = createElement({
        tagName: "div"
      , className: "DateRanger-datepickers"
      })
      // create 4 datepickers & cycle between them
      for (i = 0; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          this.ranges[i].elInputs[j].type = "text" // remove native datepicker
          this.ranges[i].elInputs[j].pikaday = this.initializeDatepicker(i)
          this.ranges[i].elInputs[j].pikaday.hide()
          this.ranges[i].elInputs[j].pikaday.el.classList.add("pika-DateRanger--date" + j)
          this.elDatepickers.appendChild(this.ranges[i].elInputs[j].pikaday.el)
        }
      }
      this.ranges[0].elInputs[0].pikaday.show()
      this.elBody.insertBefore(this.elDatepickers, this.elActionButtons)

      for (i = 0; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          var next = {
              i: i === this.ranges.length - 1 ? (j === 1 ? 0 : i) : (j === 1 ? i + 1 : i)
            , j: j === 1 ? 0 : 1
            }
            // verbose(i, j, next)
          // show next relevant picker (after syncing position)
          this.ranges[i].elInputs[j].pikaday.dateRangerInput = this.ranges[i].elInputs[j]
          this.ranges[i].elInputs[j].pikaday.dateRangerNextInput = this.ranges[next.i].elInputs[next.j]
          this.ranges[i].elInputs[j].pikaday.dateRangerResetNextInput = !j
          this.ranges[i].elInputs[j].pikaday._o.onSelect = function(date) {
            if (this.dateRangerResetNextInput) {
              that.getOrSetInputDate(this.dateRangerNextInput, null)
            }
            that.getOrSetInputDate(this.dateRangerInput, date)
            trigger(this.dateRangerInput, "change")

            this.hide()
            this.dateRangerNextInput.pikaday.calendars = this.calendars
            this.dateRangerNextInput.pikaday.show()
            // that.elCustomSection.classList.remove("DateRanger--customSection--date0")
            // that.elCustomSection.classList.remove("DateRanger--customSection--date1")
            // that.elCustomSection.classList.add("DateRanger--customSection--date" + next.j)
          }
        }
      }
    }

  , setCustomDatepickerConstraints: function(i, j) {
      this.ranges[i].elInputs[j].pikaday.setMaxDate(this.ranges[i].elInputs[j].getAttribute("max") ? moment(this.ranges[i].elInputs[j].getAttribute("max"), this.htmlDateFormat).toDate() : null)
      this.ranges[i].elInputs[j].pikaday.setMinDate(this.ranges[i].elInputs[j].getAttribute("min") ? moment(this.ranges[i].elInputs[j].getAttribute("min"), this.htmlDateFormat).toDate() : null)
      this.ranges[i].elInputs[j].pikaday.draw(true)
    }

  , resetDatepickersState: function() {
      var i
        , j
      // hide all secondary datepickers
      for (i = 1; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          this.ranges[i].elInputs[j].pikaday.hide()
        }
      }
      this.ranges[0].elInputs[1].pikaday.hide()
      this.ranges[0].elInputs[0].pikaday.show()
    }

    // datepickers trick methods
  , enhanceDatepickerWithVisibleRanges: function(datepicker) {
      // just add some class to datepicker buttons to draw ranges
      var selectedDates = []
        , days = datepicker.el.querySelectorAll(".pika-day")
        , d
        , i
        , j
      for (i = 0; i < this.ranges.length; i++) {
        for (j = 0; j < 2; j++) {
          selectedDates.push(+this.ranges[i].elInputs[j].pikaday.getDate())
        }
      }

      for (d = 0; d < days.length; d++) {
        var dIdx = selectedDates.indexOf(this.getDateInMsFromPikaAttributes(days[d]))
        if (dIdx !== -1 ) {

          days[d].parentNode.classList.add("pika-DateRanger")
          days[d].parentNode.classList.add("pika-DateRanger-selection")
          days[d].parentNode.classList.add("pika-DateRanger-selection--range" + (dIdx < 2 ? 0 : 1))
        }
      }

      for (i = 0; i < this.ranges.length; i++) {
        if (this.ranges[i].elInputs[0].pikaday.getDate() !== null && this.ranges[i].elInputs[1].pikaday.getDate() !== null) {
          this.addDateRangeClasses(days, this.ranges[i].elInputs[0].pikaday.getDate(), this.ranges[i].elInputs[1].pikaday.getDate(), "range" + i)
        }
      }
    }

  , addDateRangeClasses: function(days, start, end, classModifier) {
      var d
      for (d = 0; d < days.length; d++) {
        var date = this.getDateInMsFromPikaAttributes(days[d])
        if (date >= +start && date <= +end) {
          days[d].parentNode.classList.add("pika-DateRanger")
          days[d].parentNode.classList.add("pika-DateRanger-selection")
          days[d].parentNode.classList.add("pika-DateRanger-selection--" + classModifier)
          if (date === +start) {
            days[d].parentNode.classList.add("pika-DateRanger-selection--first")
          }
          // to handle CSS "E! + F" selector
          if (date === +end) {
            days[d].parentNode.classList.add("pika-DateRanger-selection--last")
          }
        }
      }
    }

  , getDateInMsFromPikaAttributes: function(el) {
      return new Date(
        el.getAttribute("data-pika-year")
      , el.getAttribute("data-pika-month")
      , el.getAttribute("data-pika-day")
      ).getTime()
    }

  , restoreDates: function() {
      var i
        , savedDates = this.storage.get("dates")
        , methods = []
        , methodsExists = true

      for (i = 0; i < this.ranges.length; i++) {
        methods[i] = this.storage.get("dates." + this.options.id + ".method-" + i)
        methodsExists &= !!methods[i]
      }
        // set default if there is no values saved in the session
      if (!(savedDates && methodsExists)) {
        this.setDefaultDates()
      }
      else {
        for (i = 0; i < this.ranges.length; i++) {
          this.currentMethodName[i] = methods[i]

          this.elPredefinedBtns[i][this.currentMethodName[i]].classList.add("DateRanger-button--selected")
          this.elPredefinedBtns[i][this.currentMethodName[i]].classList.add("DateRanger-predefined-button--selected")

          if (!this.isCustomRange(i)) {
            this.ranges[i].predefinedMethods[this.currentMethodName[i]]()
          }
          else {
            this.setDates(i, savedDates[i][0], savedDates[i][1])
          }

          this.updateConstraintes()
        }

        this.valuesInitialized = true
      }
    }

  , saveDates: function() {
      var i
        , j
        , dates = {}

      for (i = 0; i < this.ranges.length; i++) {
        this.storage.set("dates." + this.options.id + ".method-" + i, this.currentMethodName[i])
        dates[i] = {
            0: this.getStartDate(i)
          , 1: this.getEndDate(i)
        }
      }
      this.storage.set("dates", dates)
    }

  , setDefaultDates: function() {
      var i
      for (i = 0; i < this.ranges.length; i++) {
        this.currentMethodName[i] = this.options.ranges[i].preselected
        this.ranges[i].predefinedMethods[this.currentMethodName[i]]()
        this.elPredefinedBtns[i][this.currentMethodName[i]].classList.add("DateRanger-button--selected")
      }

      this.valuesInitialized = true
      this.saveDates()
      this.updateDates()
    }

  , predefinedSelected: function() {
      this.el.classList.remove("DateRanger--customRange")
      this.resetDatepickersState()
    }

  }

  return DateRanger

}))
