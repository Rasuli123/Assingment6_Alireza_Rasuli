/* All page construction, events, effects and movement use jQuery. */
$(function () {
  const enhanced = $("body").attr("data-task") === "2";
  let party = $.extend(true, [], initialParty);
  let pendingFinish = null;
  let panelGuest = null;
  let panelOrigin = null;
  const sorted = {};
  const colors = {
    red: "#db4352",
    blue: "#3f78dc",
    green: "#2d8b60",
    black: "#282e33",
    yellow: "#e5a21c",
    purple: "#9055cc",
  };
  const iconPaths = {
    phone: "M7 2h10v20H7z M10 19h4",
    glasses:
      "M2 11a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M14 11a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M10 11h4 M2 11V7 M22 11V7",
    bag: "M4 7h16l-2 15H6z M9 9V5a3 3 0 0 1 6 0v4",
    cup: "M4 7h13v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M17 8h2a3 3 0 0 1 0 6h-2 M8 1v3 M13 1v3",
    crumbs:
      "M3 11l7-8 8 8H3v10h15V11 M4 15h13 M4 18h13 M21 9v1 M21 16v1 M21 21v1",
  };
  const questions = [
    "Who is in the hall?",
    "Who is dressed in yellow or purple?",
    "Which AITU students are upstairs?",
    "Who has glasses or a bag?",
    "Who came with nothing at all?",
    "Who has a phone but no bag?",
    "Who arrived between 20:30 and 21:00 inclusive?",
    "Who arrived after 21:00 and is not an AITU student?",
    "Who stands right next to Askar?",
    "Who stands last in each room?",
    "Who stands third in each room?",
    "Who stands after Timur in his room?",
    "Who stands right before someone in black?",
    "In which room is Aruzhan?",
    "Which rooms have fewer than 6 guests?",
    "Which rooms have a cup but no glasses?",
    "Who came first to each room?",
    "Miras joins between Askar and Inkar.",
    "Natasha goes home.",
    "Who took the cake?",
  ];
  const caseInfo = [
    "Find every guest in the upstairs hall.",
    "Match yellow or purple clothing rings.",
    "Find AITU students on the second floor.",
    "Find guests with glasses or a bag.",
    "Find guests who brought no belongings.",
    "Find guests with a phone and no bag.",
    "Include arrivals from 20:30 through 21:00.",
    "Find non-AITU guests arriving after 21:00.",
    "Check the guests directly beside Askar.",
    "Find the final guest in every room.",
    "Find position three in each room.",
    "Find all guests after Timur in his room.",
    "Find the guest directly before anyone in black.",
    "Return Aruzhan’s room.",
    "Return rooms with fewer than six guests.",
    "Find rooms with a cup and no glasses.",
    "Find the earliest arrival in every room.",
    "Add Miras between Askar and Inkar with fadeIn.",
    "Fade Natasha out, then remove her card.",
    "Apply the downstairs, time, crumbs, cup and AITU-neighbor clues.",
  ];

  // Each case is ONE jQuery chain. Every query searches DOM cards, never party.
  const cases = [
    () => $("#house").find("#hall .guest"),
    () => $("#house").find(".guest.yellow, .guest.purple"),
    () => $("#house").find('.floor[data-floor="2"] .guest.aitu'),
    () => $("#house").find(".guest:has(.glasses), .guest:has(.bag)"),
    () => $("#house").find(".guest:not(:has(.thing))"),
    () => $("#house").find(".guest:has(.phone):not(:has(.bag))"),
    () =>
      $("#house")
        .find(".guest")
        .filter(function () {
          return (
            +$(this).attr("data-minutes") >= 1230 &&
            +$(this).attr("data-minutes") <= 1260
          );
        }),
    () =>
      $("#house")
        .find(".guest:not(.aitu)")
        .filter(function () {
          return +$(this).attr("data-minutes") > 1260;
        }),
    () =>
      $("#house")
        .find("#askar")
        .prev(".guest")
        .add($("#house").find("#askar").next(".guest")),
    () => $("#house").find(".guests > .guest:last-child"),
    () => $("#house").find(".guests > .guest:nth-child(3)"),
    () => $("#house").find("#timur").nextAll(".guest"),
    () => $("#house").find(".guest.black").prev(".guest"),
    () => $("#house").find("#aruzhan").closest(".room"),
    () =>
      $("#house")
        .find(".room")
        .filter(function () {
          return $(this).find(".guest").length < 6;
        }),
    () => $("#house").find(".room:has(.cup):not(:has(.glasses))"),
    () =>
      $("#house")
        .find(".guest")
        .filter(function () {
          const time = +$(this).attr("data-minutes");
          return (
            $(this)
              .siblings(".guest")
              .filter(function () {
                return +$(this).attr("data-minutes") < time;
              }).length === 0
          );
        }),
    () =>
      makeGuest({
        id: "miras",
        name: "Miras",
        color: "blue",
        time: "21:20",
        minutes: 1280,
        aitu: true,
        things: ["phone"],
        pictureOrder: 99,
      })
        .hide()
        .insertAfter($("#house").find("#askar"))
        .fadeIn(350),
    () =>
      $("#house")
        .find("#natasha")
        .fadeOut(350, function () {
          $(this).remove();
          updateCounts();
        }),
    () =>
      $("#house")
        .find('.floor[data-floor="1"] .guest:has(.crumbs):not(:has(.cup))')
        .filter(function () {
          return (
            +$(this).attr("data-minutes") > 1260 &&
            +$(this).attr("data-minutes") < 1290
          );
        })
        .filter(function () {
          return (
            $(this).prev(".guest.aitu").add($(this).next(".guest.aitu"))
              .length > 0
          );
        }),
  ];

  function makeGuest(g) {
    const $g = $("<article>")
      .attr({
        id: g.id,
        tabindex: 0,
        role: "button",
        "aria-label": "Guest " + g.name,
        "data-name": g.name,
        "data-color": g.color,
        "data-time": g.time,
        "data-minutes": g.minutes,
        "data-aitu": String(g.aitu),
        "data-things": g.things.join(","),
        "data-picture-order": g.pictureOrder,
      })
      .addClass("guest " + g.color + (g.aitu ? " aitu" : ""))
      .css("--clothing", colors[g.color]);
    const avatarSrc =
      typeof avatarSources !== "undefined" && avatarSources[g.id]
        ? avatarSources[g.id]
        : "../avatars/" + g.id + ".svg";
    $("<img>")
      .addClass("avatar")
      .attr({ src: avatarSrc, alt: g.name + " avatar" })
      .appendTo($g);
    if (g.aitu) $("<span>").addClass("badge").text("AITU").appendTo($g);
    $("<b>").text(g.name).appendTo($g);
    $("<span>").addClass("time").text(g.time).appendTo($g);
    const $things = $("<span>").addClass("things").appendTo($g);
    $.each(g.things, function (_, item) {
      $("<span>")
        .addClass("thing " + item)
        .attr({ title: item, "aria-label": item })
        .append(
          $(
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
              iconPaths[item] +
              '"/></svg>',
          ),
        )
        .appendTo($things);
    });
    return $g;
  }
  function updateCounts() {
    $(".room").each(function () {
      $(this)
        .find(".room-count")
        .text($(this).find(".guests > .guest").length + " guests");
    });
  }
  function build() {
    $("#house").empty();
    $.each([2, 1], function (_, floor) {
      const $floor = $("<section>")
        .addClass("floor")
        .attr("data-floor", floor)
        .appendTo("#house");
      $("<div>")
        .addClass("floor-label")
        .text("FLOOR " + floor)
        .appendTo($floor);
      $.each(party, function (_, room) {
        if (room.floor !== floor) return;
        const $room = $("<section>")
          .addClass("room")
          .attr({ id: room.id, "data-name": room.name, "data-floor": floor })
          .appendTo($floor);
        const $title = $("<div>").addClass("room-title").appendTo($room);
        $("<h2>")
          .text(room.name)
          .append($("<small>").addClass("room-count"))
          .appendTo($title);
        if (enhanced)
          $("<button>")
            .addClass("sort")
            .attr("data-room", room.id)
            .text("Sort by time")
            .appendTo($title);
        const $list = $("<div>").addClass("guests").appendTo($room);
        $.each(room.guests, function (_, g) {
          makeGuest(g).appendTo($list);
        });
      });
    });
    updateCounts();
    $.each(sorted, function (id, value) {
      $("#" + id + " .sort").text(value ? "Picture order" : "Sort by time");
    });
  }
  // Finish the current effect once, clear queues, then accept the next action.
  function settle() {
    if (pendingFinish) pendingFinish();
    $("#house .guest, .info-panel, .flying, .slot").stop(true, true);
    $("#house .guest").css({ top: 0, left: 0 });
  }
  function closePanel(immediate, after) {
    const $panel = $(".info-panel");
    if (!$panel.length) {
      if (after) after();
      return;
    }
    $panel.stop(true, true);
    const $origin = panelOrigin;
    panelGuest = null;
    panelOrigin = null;
    const finish = function () {
      $panel.remove();
      if (after) after();
    };
    if (immediate || !$origin || !$origin.closest("html").length) {
      finish();
      return;
    }
    const at = $origin.offset();
    $panel.animate(
      {
        left: at.left,
        top: at.top,
        width: $origin.outerWidth(),
        height: $origin.outerHeight(),
        opacity: 0,
        padding: 0,
      },
      220,
      finish,
    );
  }
  function spotlight($found, preserveFoundEffect) {
    if (!enhanced) return;
    const $bright = $found.is(".room") ? $found.find(".guest") : $found;
    $("#house .guest").not($bright).stop(true, true).fadeTo(300, 0.2);
    if (!preserveFoundEffect) $bright.stop(true, true).fadeTo(300, 1);
  }
  function runCase(index) {
    settle();
    closePanel(true);
    build();
    $("#case-buttons .case-tile")
      .removeClass("active")
      .filter('[data-tile="' + (index + 1) + '"]')
      .addClass("active");
    const $found = cases[index]();
    const names = $found
      .map(function () {
        return $(this).attr("data-name");
      })
      .get();
    $("#result")
      .empty()
      .append(
        $("<strong>").text("Case " + (index + 1) + " · " + questions[index]),
      )
      .append(
        $("<span>").text(
          (index === 18
            ? "Leaving: "
            : index === 17
              ? "Joining: "
              : "Found " + names.length + ": ") + names.join(", "),
        ),
      );
    if (index !== 18) {
      $found.addClass("found");
      const $guests = $found.is(".room") ? $found.find(".guest") : $found;
      spotlight($found, index === 17);
      // queue:false preserves Miras's fadeIn while his single jump runs.
      $guests.animate(
        { top: -12 },
        {
          duration: 160,
          queue: false,
          complete: function () {
            $(this).animate({ top: 0 }, { duration: 160, queue: false });
          },
        },
      );
    } else spotlight($found, true);
    updateCounts();
    return names;
  }
  function openPanel($guest) {
    if (!enhanced) return;
    settle();
    closePanel(false, function () {
      panelGuest = $guest.attr("id");
      panelOrigin = $guest.find(".avatar");
      const source = panelOrigin.offset();
      const w = 340,
        h = 330;
      const left = Math.max(
        12,
        Math.min(
          source.left - 70,
          $(window).width() + $(window).scrollLeft() - w - 15,
        ),
      );
      const top = Math.max(
        $(window).scrollTop() + 12,
        Math.min(
          source.top - 20,
          $(window).scrollTop() + $(window).height() - h - 15,
        ),
      );
      const $panel = $("<aside>")
        .addClass("info-panel")
        .attr({
          role: "dialog",
          "aria-label": $guest.attr("data-name") + " details",
        })
        .css({
          left: source.left,
          top: source.top,
          width: panelOrigin.outerWidth(),
          height: panelOrigin.outerHeight(),
          opacity: 0,
          padding: 0,
        })
        .appendTo("body");
      $("<button>")
        .addClass("close")
        .attr("aria-label", "Close guest card")
        .text("×")
        .appendTo($panel);
      $("<h2>").text($guest.attr("data-name")).appendTo($panel);
      $("<p>")
        .text(
          "Came at " +
            $guest.attr("data-time") +
            ". " +
            ($guest.hasClass("aitu")
              ? "AITU student."
              : "Not an AITU student.") +
            " Clothing color: " +
            $guest.attr("data-color") +
            ".",
        )
        .appendTo($panel);
      const things = $guest.attr("data-things").split(",").filter(Boolean);
      const words = $.map(things, function (t) {
        return {
          phone: "a phone",
          glasses: "glasses",
          bag: "a bag",
          cup: "a cup",
          crumbs: "cake crumbs",
        }[t];
      });
      $("<p>")
        .text(
          words.length
            ? "Has " +
                (words.length > 1
                  ? words.slice(0, -1).join(", ") +
                    " and " +
                    words[words.length - 1]
                  : words[0]) +
                "."
            : "Came with nothing at all.",
        )
        .appendTo($panel);
      $("<p>")
        .text(
          "Room: " +
            $guest.closest(".room").attr("data-name") +
            ". Floor: " +
            $guest.closest(".floor").attr("data-floor") +
            ".",
        )
        .appendTo($panel);
      const $moves = $("<div>").addClass("moves").appendTo($panel);
      $(".room")
        .not($guest.closest(".room"))
        .each(function () {
          $("<button>")
            .attr("data-target", this.id)
            .addClass("move")
            .text("Move to the " + $(this).attr("data-name").toLowerCase())
            .appendTo($moves);
        });
      $panel.animate(
        { left: left, top: top, width: w, height: h, opacity: 1, padding: 20 },
        260,
      );
    });
  }
  function moveGuest(id, target) {
    settle();
    closePanel(true);
    const $guest = $("#house #" + id),
      $destination = $("#" + target + " .guests");
    if (
      !$guest.length ||
      !$destination.length ||
      $guest.parent().is($destination)
    )
      return;
    const oldRoom = $guest.closest(".room").attr("id");
    const at = $guest.offset(),
      width = $guest.outerWidth(),
      height = $guest.outerHeight();
    const $old = $("<div>")
      .addClass("slot")
      .css({ width: width, height: height });
    const $new = $("<div>")
      .addClass("slot")
      .css({ width: 0, height: height })
      .appendTo($destination);
    const $fly = $guest
      .clone()
      .removeAttr("id")
      .attr("aria-hidden", "true")
      .addClass("flying")
      .css({ left: at.left, top: at.top, width: width, opacity: 1 })
      .appendTo("body");
    $guest.replaceWith($old);
    // Reserve the final slot long enough to measure the actual destination.
    $new.css("width", width);
    const to = $new.offset();
    $new.css("width", 0);
    let done = false;
    const finish = function () {
      if (done) return;
      done = true;
      pendingFinish = null;
      $fly.stop(true, false).remove();
      $old.stop(true, false).remove();
      $new
        .stop(true, false)
        .replaceWith($guest.css({ opacity: 1, top: 0, left: 0 }));
      let moved;
      $.each(party, function (_, room) {
        if (room.id === oldRoom) {
          room.guests = $.grep(room.guests, function (g) {
            if (g.id === id) {
              moved = g;
              return false;
            }
            return true;
          });
        }
      });
      $.each(party, function (_, room) {
        if (room.id === target && moved) room.guests.push(moved);
      });
      delete sorted[oldRoom];
      delete sorted[target];
      $("#" + oldRoom + " .sort, #" + target + " .sort").text("Sort by time");
      $(".found").removeClass("found");
      $("#house .guest").stop(true, true).fadeTo(150, 1);
      updateCounts();
      $("#result").text(
        $guest.attr("data-name") +
          " moved to the " +
          $("#" + target)
            .attr("data-name")
            .toLowerCase() +
          ". The party array is updated.",
      );
    };
    pendingFinish = finish;
    $old.animate({ width: 0 }, 500);
    $new.animate({ width: width }, 500);
    $fly.animate({ left: to.left, top: to.top }, 500, finish);
  }
  function sortRoom(id) {
    settle();
    closePanel(true);
    const $list = $("#" + id + " .guests");
    const positions = {};
    $list.children(".guest").each(function () {
      positions[this.id] = $(this).position();
    });
    sorted[id] = !sorted[id];
    const nodes = $list
      .children(".guest")
      .get()
      .sort(function (a, b) {
        const key = sorted[id] ? "data-minutes" : "data-picture-order";
        return +$(a).attr(key) - +$(b).attr(key);
      });
    $.each(nodes, function (_, node) {
      $list.append(node);
    });
    $.each(nodes, function (_, node) {
      const $g = $(node),
        to = $g.position(),
        from = positions[node.id];
      $g.css({ left: from.left - to.left, top: from.top - to.top }).animate(
        { left: 0, top: 0 },
        420,
      );
    });
    $.each(party, function (_, room) {
      if (room.id === id) {
        const order = $.map(nodes, function (n) {
          return n.id;
        });
        room.guests.sort(function (a, b) {
          return $.inArray(a.id, order) - $.inArray(b.id, order);
        });
      }
    });
    $("#" + id + " .sort").text(sorted[id] ? "Picture order" : "Sort by time");
    $("#result").text(
      $("#" + id).attr("data-name") +
        " · " +
        (sorted[id] ? "Arrival order: " : "Picture order: ") +
        $list
          .children(".guest")
          .map(function () {
            return $(this).attr("data-time");
          })
          .get()
          .join(", "),
    );
  }
  $.each(questions, function (i, q) {
    const $tile = $("<article>")
      .addClass("case-tile")
      .attr("data-tile", i + 1)
      .appendTo("#case-buttons");
    $("<span>")
      .addClass("case-number")
      .text("CASE " + String(i + 1).padStart(2, "0"))
      .appendTo($tile);
    $("<h3>").text(q).appendTo($tile);
    $("<p>").text(caseInfo[i]).appendTo($tile);
    $("<button>")
      .attr({ "data-case": i + 1, "aria-label": "Run case " + (i + 1) })
      .text("Run case")
      .appendTo($tile);
  });
  $("#case-buttons").on("click", "button", function () {
    runCase(+$(this).attr("data-case") - 1);
  });
  $("#clear").on("click", function () {
    settle();
    closePanel(true);
    $(".found").removeClass("found");
    $("#house .guest").stop(true, true).fadeTo(300, 1);
    $("#case-buttons .case-tile").removeClass("active");
    $("#result").text("Cleared. Everybody is bright again.");
  });
  $("#reset").on("click", function () {
    settle();
    closePanel(true);
    party = $.extend(true, [], initialParty);
    $.each(sorted, function (k) {
      delete sorted[k];
    });
    build();
    $("#case-buttons .case-tile").removeClass("active");
    $("#result").text("Party reset to the picture.");
  });
  if (enhanced) {
    $("#house")
      .on("click", ".guest", function () {
        openPanel($(this));
      })
      .on("keydown", ".guest", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPanel($(this));
        }
      });
    $("#house").on("click", ".sort", function () {
      sortRoom($(this).attr("data-room"));
    });
    $(document)
      .on("click", ".info-panel .close", function () {
        closePanel(false);
      })
      .on("click", ".info-panel .move", function () {
        moveGuest(panelGuest, $(this).attr("data-target"));
      });
    $(document)
      .on("click", function (e) {
        if (!$(e.target).closest(".info-panel,.guest").length)
          closePanel(false);
      })
      .on("keydown", function (e) {
        if (e.key === "Escape") closePanel(false);
      });
  }
  $("#task-note").text(
    enhanced
      ? "Click any guest for the information card and room-move buttons. Use each room’s Sort by time button to switch between arrival order and picture order. Cases rebuild from the current party array; Reset restores the original picture."
      : "Each case starts from the original party. Cases 18 and 19 demonstrate smooth insertion and removal.",
  );
  build();
  // Read-only access for reproducible verification; interactions still use buttons.
  window.partyApp = {
    questions: questions,
    caseInfo: caseInfo,
    chains: $.map(cases, function (fn) {
      return fn.toString();
    }),
    snapshot: function () {
      return $.extend(true, [], party);
    },
  };
});
