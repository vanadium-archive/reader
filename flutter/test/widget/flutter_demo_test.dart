// Copyright 2016 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'package:test/test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reader/widgets/flutter_demo.dart';

void main() {
  test("Example State test", () {
    testWidgets((WidgetTester tester) {
      tester.pumpWidget(new MaterialApp(
          title: 'Test App',
          routes: <String, WidgetBuilder>{
            '/': (BuildContext context) => new FlutterDemo()
          }));

      // Ensure default redner is correct.
      expect(tester, hasWidget(find.text("Flutter Demo")));
      expect(tester, hasWidget(find.text("Button tapped 0 times.")));

      // Test state methods effect the render.
      FlutterDemoState state = tester.stateOf(find.byType(FlutterDemo));
      state.incrementCounter();

      // Advance the flutter framework to the next tick.
      tester.pump();

      expect(state.counter, equals(1));
      expect(tester, hasWidget(find.text("Button tapped 1 time.")));

      // NOTE: There is an animation segue for the floating action button in
      // the material scaffold. The FAB is not tappable during this initial
      // segue, the FAB will not be responsive to tapping until the animation
      // ends at 400ms.
      //
      // SEE: https://git.io/vwrlS
      tester.pump(new Duration(milliseconds: 400));

      Finder fab = find.byType(FloatingActionButton);
      expect(tester, hasWidget(fab));

      tester.tap(fab);
      tester.pump();

      expect(state.counter, equals(2));
      expect(tester, hasWidget(find.text("Button tapped 2 times.")));

      // Wait for animations to end.
      tester.pump(const Duration(seconds: 1));
    });
  });
}
