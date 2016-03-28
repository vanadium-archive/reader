// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'package:flutter/material.dart';
import 'widgets/flutter_demo.dart';

void main() {
  runApp(new MaterialApp(
      title: 'Flutter Demo',
      routes: <String, WidgetBuilder>{
        '/': (BuildContext context) => new FlutterDemo()
      }));
}
