(function () {
  'use strict';

  /* «Վերադառնալ». եթե օգտատերը եկել է մեր կայքի գլխավոր էջից, վերադառնում ենք նույն տեղը (scroll-ը պահպանվում է),
     հակառակ դեպքում՝ index.html#route (href-ը) */
  var back = document.querySelector('.v__back');
  if (back) {
    back.addEventListener('click', function (e) {
      var ref = document.referrer;
      if (ref && window.history.length > 1) {
        try {
          if (new URL(ref).origin === window.location.origin) { e.preventDefault(); window.history.back(); }
        } catch (err) { /* թողնում ենք սովորական հղումը */ }
      }
    });
  }
})();
