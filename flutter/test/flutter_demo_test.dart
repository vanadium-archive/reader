// Copyright 2016 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import "package:test/test.dart";
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reader/components/flutter_demo.dart';

void main() {
  test("Example State test", () {
    testWidgets((WidgetTester tester) {
      GlobalKey key = new GlobalKey();
      tester.pumpWidget(new MaterialApp(
          title: 'Test App',
          routes: <String, RouteBuilder>{
            '/': (RouteArguments args) => new FlutterDemo(key: key)
          }));

      // Test State.
      StatefulComponentElement element = tester.findElementByKey(key);
      FlutterDemoState state = element.state;

      expect(tester.findText("Flutter Demo"), isNotNull);
      expect(tester.findText("Button tapped 0 times."), isNotNull);

      state.incrementCounter();
      // Advance the flutter framework to the next tick.
      tester.pump();

      expect(state.counter, equals(1));
      expect(tester.findText("Button tapped 1 time."), isNotNull);

      // NOTE: There is an animation segue for the floating action button in
      // the material scaffold. The FAB is not tappable during this initial
      // segue, the FAB will not be responsive to tapping until the animation
      // ends at 400ms.
      //
      // SEE: https://git.io/vaLPb
      tester.pump(new Duration(milliseconds: 400));

      // Test Widget input and rendering.
      StatefulComponentElement fab = tester.findElement((Element element) {
        return element.widget is FloatingActionButton;
      });

      expect(fab, isNotNull);

      tester.tap(fab);
      tester.pump();

      expect(state.counter, equals(2));
      expect(tester.findText("Button tapped 2 times."), isNotNull);
    });
  });
}
