// Copyright 2016 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'package:flutter/material.dart';

class FlutterDemo extends StatefulWidget {
  FlutterDemo({Key key}) : super(key: key);

  @override
  FlutterDemoState createState() => new FlutterDemoState();
}

class FlutterDemoState extends State<FlutterDemo> {
  int counter = 0;

  void incrementCounter() {
    setState(() {
      counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return new Scaffold(
        appBar: new AppBar(title: new Text('Flutter Demo')),
        body: new Center(child: new Text(
            'Button tapped $counter time${ counter == 1 ? '' : 's' }.')),
        floatingActionButton: new FloatingActionButton(
            onPressed: incrementCounter,
            tooltip: 'Increment',
            child: new Icon(icon: Icons.add)));
  }
}
