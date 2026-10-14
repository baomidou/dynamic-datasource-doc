# 版本记录与选择建议

## 版本支持
| dynamic-datasource    | jdk    |springboot    |gravvel|druid|
| ---| --- | --- |--- |--- |
|  3.5.2   |  jdk1.7+ |1.5.x和2.x.x和3.x.x |不支持|不支持1.2.17引入的socketTimeout和connectTimeout|
|  4.1.3 | jdk1.7+ |1.5.x和2.x.x和3.x.x |不支持|都支持|
|  >=4.2.0   |  jdk1.8+|1.5.x和2.x.x和3.x.x|支持|都支持|

- 新用户建议直接使用4.x.x版本。
- 如果当前版本用的好好的，后续也没有需要的特性建议不升级。

## 4.x主要变化：
1. 分包：为了更好的适配springboot3同时保留对springboot1.5版本和2.x版本和java7用户的支持。
dynamic-datasource-spring-boot-starter 和dynamic-datasource-spring-boot3-starter。
2. 本地事务新增了多数据源传播机制。
3. 适配atomikos数据源。（作者还在详细测试-暂不出文档）
4. 适配1.2.17+Druid数据源。

所有用法和以前版本没差异，不过分包过程中为了将来脱离spring。 你如果用到了动态添加移除数据源，建议只用DefaultCreator来创建。

## 4.3.1
* fix 修复 启动警告问题 by @JavaLionLi in https://github.com/baomidou/dynamic-datasource/pull/617
* perf(close-datasource): 在分组数据库map删除后删除datasource by @BingChunMoLi in https://github.com/baomidou/dynamic-datasource/pull/618
* fix:事务后置回调中开启事务死循环 by @ZPZP1 in https://github.com/baomidou/dynamic-datasource/pull/621
* feat: 增加 MySQL Connector/J 5.1 XADataSource 的支持 by @1s1y in https://github.com/baomidou/dynamic-datasource/pull/627
* fix:DruidDatasource无法关闭closed (baomidou#637) by @shen3 in https://github.com/baomidou/dynamic-datasource/pull/638

## 4.3.0
*   修復 Springboot3自帶了undertow … by[@alvinkwok1](https://github.com/alvinkwok1)in[#590](https://github.com/baomidou/dynamic-datasource/pull/590)
*   feat: update-readme, format configuration yaml by[@alvinkwok1](https://github.com/alvinkwok1)in[#592](https://github.com/baomidou/dynamic-datasource/pull/592)
*   perf:[@bean](https://github.com/bean)初始化优化, 以消除日志:is not eligible for getting processed by all BeanPostProcessors by[@qxo](https://github.com/qxo)in[#608](https://github.com/baomidou/dynamic-datasource/pull/608)
*   chore: gitignore add virtual machine crash logs by[@qxo](https://github.com/qxo)in[#609](https://github.com/baomidou/dynamic-datasource/pull/609)
*   fix(dynamic-datasource-creator):解决当存在publicKey时，druid数据源创建异常问题 by[@qq592304796](https://github.com/qq592304796)in[#605](https://github.com/baomidou/dynamic-datasource/pull/605)
*   Fixes CI errors caused by Druid and Spring Framework changes by[@linghengqian](https://github.com/linghengqian)in[#613](https://github.com/baomidou/dynamic-datasource/pull/613)

## 4.2.0
* 重构druid创建过程，先合并全局参数再配置
* 支持druid动态添加的filter.
* 字符串工具类的替换。
* fix @DSTransactional 无法获取注解属性|统一属性解析逻辑 by @ZPZP1


* 支持springboot3 GraalVM 超级感谢@linghengqian




* feat:增加多数据源事务同步机制 by @ZPZP1
* feat: 支持延迟移除数据源  by @alvinkwok1 

## v4.1.3   

*   最大加密字节数 53 ，超出最大字节数需要分组加密； 最大解密字节数 64 ，超出最大字节数需要分组解密 by[@aienuo](https://github.com/aienuo)in[#537](https://github.com/baomidou/dynamic-datasource/pull/537)
*   fix druid filters init bug by[@hieastz](https://github.com/hieastz)in[#541](https://github.com/baomidou/dynamic-datasource/pull/541)
*   移除spring-boot-starter-web依赖
*   fix: 事务强关联mybatis-plus

## v4.1.2 
* fix REQUIRED主事务内多个NESTED次事务不提交事务bug by[@Alan-pan](https://github.com/Alan-pan)in[#531](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/531)[@ZPZP1](https://github.com/ZPZP1)in[#533](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/533)
*   fix yml参数不提示
*   refactor 重构druid参数设置
*   fix event没有注入

## v4.1.1
* 修复Druid加密失败。

## v4.1.0 
*   fix ArrayStoreException during parsing annotations by[@itinycheng](https://github.com/itinycheng)in[#519](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/519)
*   fix:NoClassDefFoundError of TransactionFactory by[@ZPZP1](https://github.com/ZPZP1)in[#521](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/521)
*   fix: NPE when add datasources from provider. by[@darknesstm](https://github.com/darknesstm)in[#525](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/525)

## v4.0.0 不建议
*   新增多数据源事务传播机制 by[@zhaohaoh](https://github.com/zhaohaoh)in[#406](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/406)
*   Migrating from Jakarta EE 9 to Jakarta EE 10 by[@linghengqian](https://github.com/linghengqian)in[#474](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/474)
*   feat:增加适配atomikos数据源,支持同一个事务下多次切换数据源 by[@ZhiFengJia](https://github.com/ZhiFengJia)in[#481](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/481)
*   feat:增加多数据源事务传播属性NESTED by @zpbaba in[#483](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/483)
*   feat: 支持Druid DataSource timeBetweenConnectErrorMillis Config by[@xuwenping123](https://github.com/xuwenping123)in[#489](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/489)
*   fix:fix log output information error by @zpbaba in[#501](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/501)
*   fix:fix UUID generate blocked by @zpbaba in[#507](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/507)
*   修复SpringBoot 自动装配路径错误 by[@jidaojiuyou](https://github.com/jidaojiuyou)in[#510](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/510)

## v3.6.1  非建议版本
* 解决Druid socketTimeout 设置失败问题

## v3.6.0 非建议版本

*   支持spirngboot3
*   ✨支持 Spring Boot 新版自动配置 by[@xuxiaowei-com-cn](https://github.com/xuxiaowei-com-cn)in[#454](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/454)
*   支持配置druid新版本socketTimeout、connectTimeout属性 by[@Liu-YanP](https://github.com/Liu-YanP)in[#456](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/456)

## v3.5.2 稳定版本

*   throw exception in local transaction by[@Nutao](https://github.com/Nutao)in[#426](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/426)
*   适用spel的#root.target by[@huaibingshifu](https://github.com/huaibingshifu)in[#427](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/427)
*   解决DruidConfig的stat、wall属性使用Map接受参数了，DruidStatConfigUtil在进行反射赋值的时候会报错 by[@Bin1993](https://github.com/Bin1993)in[#434](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/434)
*   让默认的DynamicDataSourceProvider优先级为0 by[@VonXXGhost](https://github.com/VonXXGhost)in[#437](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/437)
*   support hikaricp 原生参数

## v3.5.1 
* 修复了druid设置log的filter判断bug。
## v3.5.0


* feat:新增druid慢sql日志级别配置项 by @whcrow in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/402
* feat:新增本地事务对类的支持 #387 by @lonecloud in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/405
* feat:新增是否开启默认DS注解选项(#396) by @lonecloud in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/401
* feat:新增一个event，可在数据源创建前后做自己操作。可用于自定义解密。
* feat:新增一个LocalTxUtil可手动开启提交回滚本地事务。
* fix:修复某些情况下关闭数据源调用close失败 by @cheese8 in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/391
* fix:修复 @DS优先级 #407 by @lonecloud in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/408
* fix:修复同时开启p6spy和seata，p6spy不生效的问题。
* refactor: 重构creator的自动注入逻辑。
* refactor: 重构druid的各种filter的参数注入，使用map来支持任意参数。
* break:移除健康检查（支持不好，以后考虑重写）
* break:重构自动建表配置新增init层级。
* break: 重构策略strategy的方法为determineKey。
* 其他，注释的完善。

## New Contributors
* @cheese8 made their first contribution in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/391
* @r-asou made their first contribution in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/392
* @lonecloud made their first contribution in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/401
* @whcrow made their first contribution in https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/402

**Full Changelog**: https://github.com/baomidou/dynamic-datasource-spring-boot-starter/compare/v3.4.1...v3.5.0

## v3.4.1

- refactor: 使用反射重构了全局参数和局部参数的使用。
- refactor: 移除了关闭数据源的工具类，放回动态数据源类中。（部分用户反馈工具类失败）
- refactor: 默认所有creator继承一个抽象creator处理共有逻辑。
- feat: 可单独指定poolName了。 以前poolName和数据源名称保持一致，现在默认一致除非指定。
- feat: 支持从继承的接口上读取数据源。

## v3.4.0

- fix:  修复非默认连接池创建器创建的数据源关闭失败问题。
- fix: 修复连接池创建器创建的数据源lazy空指针问题。
- fix: 修复本地事务，使用默认数据源不加DS空指针问题。
- feat: 新增一个DynamicDataSourcePropertiesCustomizer 以支持参数扩展。
- feat: breake change，支持同时从多个来源初始化数据源。
- feat: 新增一个DynamicDatasourceNamedInterceptor 以支持手动配置切面。

## v3.3.6

- fix:  部分用户反馈强依赖DBCP。
- feat: beecp和dbcp的创建根据反射重构。
- style: 移除没用的stringUtils。
- style: 增加些许注释。

## v3.3.5

- fix: 修复上个版本BeeCp判断存在误用HIkaricp地址的错误。
- feat: 新增dbcp2连接池支持。
- fix: ItemDataSource的wrap修复，获得真实连接。
- style: 移除HIkaricp无用的配置。

## v3.3.4

- fix: 修复上个版本更改Advisor引起的数据源不能切换严重错误。
- feat: 新增beecp连接池支持。
- fix: ItemDataSource的wrap修复，获得真实连接。

## v3.3.3 严重BUG版本不能使用

- feat:重要更新-Druid不用再手动排除。
- spel解析新增beanFactory。

## v3.3.2

- feat:重要更新-支持无数据源启动，支持配置懒启动数据源。
- refactor:重要更新-Druid不再默认启动wall的filter。
- refactor:重要更新-DataSourceCreator移除含有publicKey的方法，由DefaultDataSourceCreator传递。
- refactor:DefaultDataSourceCreator独立不继承DataSourceCreator。
- refactor:简化本地事务ThreadLocal。
- feat: 健康检查优化。
- style:license format。
- chore:remove travis。

## v3.3.1

- fix: 修复打包后强制依赖seata报错。

## v3.3.0 BUG版本不能使用

- feat:重要：本地多数据源事物支持。 @FUNKYE
- feat:底层数据源保存方式修改为ConcurrentHashMap。 @刘尚
- revert:重构底层Creator的创建规则。@刘尚
- feat:添加同名数据源覆盖老数据源。@刘尚
- feat:支持部分从接口继承DS的场景。@CQJames
- fix:修复Druid防火墙一个参数设置错误。@mrf
- fix:修复极端情况下的设置数据源异常处理。@happier233

## v3.2.1

- 提供注解查找非public方法的扩展。 @刘尚
- 修复数据源关闭的错误。 @zuihou
- 修复创建ItemDatasource参数错误。
- 修复自定义注解在方法上失效。
- 添加默认的Master和Slave注解。
- 示例项目整体迁出为独立项目https://github.com/dynamic-datasource/dynamic-datasource-samples 。

## v3.2.0

- 支持通配符扫描schema文件。 @superlyao
- 支持配置driverClassName为非必须属性。@Hccake
- 支持独立配置每个库的p6spy和seata的开启状态。
- 修复druid设置超时回收时间方法错误。 @liupeng
- 支持自定义注解，需继承DS。 @liupeng
- 修复spring.aop.auto=false下不支持问题。 @刘尚
- 修复多层代理无法获取InvocationHandler的实现类的问题。 @刘尚
- 修复mybatisPlus3下直接调用lamba方法不支持问题。 @刘尚
- seata集成优化和示例项目更新1.3.0。  @a364176773
- 调用DataSourceCreator创建的数据源会包装成ItemDataSource，存储原dataSource和包装后的dataSource。
- DynamicRoutingDataSource内部关闭数据源优化。
- breakChange: 去除以前的实验性功能，如正则切换。
- 示例项目新增quartz和sharding-jdbc的集成。
- 示例项目整体更新。

## v3.1.1

- revert: 不使用NamedInheritableThreadLocal。
- 设置默认spel解析方式为空,提供set方法可重定义解决复杂场景spel表达式问题。
- 格式化正式工程为IDEA默认格式化方案。
- 部分日志等级降低为debug。
- druid部分日志添加集成引导。

## v3.1.0 BUG版本不能使用

- 删除数据源不允许删除主数据源。
- 使用NamedInheritableThreadLocal。
- 增加druid参数queryTimeOut配置。
- 模块化creator和注册为BEAN。

## v3.0.0

- 支持 seata 分布式事务。
- creator 模块化改造。
- 解决启动类判断druid自动配置冲突问题。

## v2.5.8

- spel切换下的空指针异常处理。
- pollName优先使用外部配置。
- 支持classpath开头的schema。
- 取消自动数据源监测，后续需要手动开启。
- 新增druid的slf4j的简单配置。
- 支持集成seata。
- 内部模块化的更好分层。

## v2.5.7

- 优化底层map存储初始化大小。
- 支持数据源变化监控，基于actuator。
- 优化主从分离插件内部逻辑。

## v2.5.6

- 支持非web环境启动。
- 支持加密自定义公钥和全局公钥。
- 启动初始化数据默认分隔符改为分号 `;`  。
- google代码格式化。
- 添加从数据库初始加载数据源例子。

## v2.5.5

- 支持非web环境启动。
- 支持内置加密。
- 支持启动ddl  schema和data。

## v2.5.4

- 集成druid支持配置proxyFilter。
- 修复打war包外部部署错误。
- 修复内置的读写分离插件错误。
- 修复关闭数据源异常。
- 修复日志打印小错误。
- 新增严格模式。

## v2.5.3

- 自定义切面支持动态解析。 https://github.com/baomidou/dynamic-datasource-spring-boot-starter/pull/29

## v2.5.2

- 解决对mp3.1.0的支持。

## v2.5.1

- 工具类新增清空本地线程的方法。
- 优化对p6spy的支持。
- 新增在Mybatis环境下的纯读写分离插件，无需注解。
- 新增关闭数据源的destroy方法。
- 完善druid的wall和stat的配置支持。

## v2.5.0

- 修复数据源启动说明错误。
- 修复负载均衡策略切换隐藏bug。
- 底层更换为ArrayDeque。
- 重构动态处理器。

## v2.4.2

- 引入了实验性的功能： 根据正则或spel来自动匹配数据源。

## v2.4.1

- 修复了上个版本hikari不兼容1.5.x的BUG。
- 提供了hikari全局属性的配置。

## v2.4.0
- 重构了druid配置。
- 支持了更多druid参数配置，支持了加密。
- 完善了文档。

## v2.3.6 
- 修复上个版本的druid参数设置bug。
- 对外开放获取所有数据源和所有组数据源方法。

## v2.3.5 druid参数设置有bug
- 支持p6sy。(格式化sql利器)
- 支持jndi数据源。
- 支持druid更多参数。
- 支持hikari参数设置。
- 切换数据源工具类只有在clear的时候才移除当前数据源名称。
- 启动带上数据源名称。
- 添加了更多的测试代码。

## v2.3.4
- 底层细节优化。
- 重构多级数据源切换。
- 示例项目重构。

## v2.3.3 BUG版本不能使用
- 支持嵌套下多级的数据源切换(service1 mysql调用service2 oracle)。

https://gitee.com/baomidou/dynamic-datasource-spring-boot-starter/issues/IO33C

- 修复spel对request和session的支持。

## v2.3.2 BUG版本不能使用
- 修复在不需要session的场景中自动注入session。

## v2.3.1 BUG版本不能使用
- 修复2.3.0中使用spel session 和header的取值错误。

## v.2.3.0

- 重构创建数据源类。废弃DataSourceFactory，改为Bean的DynamicDataSourceCreator。
- 自动适配mybatisPlus，移除参数的mp-enabled。
- 新特性支持spel参数获取数据源。

## v2.2.3

- 支持druid参数全局配置。
- 对外暴露动态添加删除数据源的方法。
- 增加在组内数据源为空时使用默认数据源。
- 去除启动时校验组内只有单个数据源。

## v2.2.2 BUG版本不能使用

- 修复上个版本mp3适配失败的Bug。

## v2.2.1

- 适配mybatis2.x版本。

## v2.2.0

- 修复从默认数据源获取数据不能是组数据源的bug。
- 摒弃spring原生动态数据源抽象，重新实现。
- 去除底层方法缓存。
- 提供从JDBC中获取数据源的抽象。
- 部分代码重新划分包。
- license的组织名更新成为baomidou。

## v2.1.1

- 切面顺序调整为最高。
- 底层切换数据源逻辑优化。

## v2.1.0

- 修复了底层一个逻辑bug。
- 提供了对mp的原生支持。
- 底层代码进行了细微的性能优化。

## v2.0.2

- 修复springboot2.0以上版本不能设置HikariDataSource。
- 底层代码的整理。
- Druid数据源初始大小改为3。

## v2.0.1

- 修复一个方法缓存的bug，会引起同名方法的注解失效。
- 底层代码的重命名和部分格式的调整。

## v2.0.0

- Breaking change：数据源配置同级，不再默认主从，支持多种方案。
- Breaking change：使用约定大于配置，开启 多组模式 新启程。
- Breaking change：注解包路径变更，与苞米豆其他项目保持一致写法。
- Breaking change：不再支持@DS空注解。
- Breaking change：不再支持强制主库force-master配置。
- Breaking change：数据源选择策略现在如需更改需要设置配置文件的dynamicDataSourceStrategyClass。
- Druid数据源默认validation-query 为select 1 。
- 全部源码改为中文。
- 增加了部分启动时和运行中的日志。

## v1.4.0

- 支持了在类上注解，如果方法上同时有注解则方法注解优先。
- 支持了遇到事物强制主库，并且是默认行为，可在配置更改foeceMaster。
- 最低支持jdk1.7，springboot1.4.x。
- 重构aop，解决了部分springboot版本引入插件无效的问题。

## v1.3.0

- 对Druid的paCache属性提供支持。
- 还原上一版本切面的配置方式。
- 其他一些细节的优化。

## v1.2.0

- 对Druid提供更完善的支持。
- 更改了默认的注解切面的注入方式。
- 抽象了切面选择数据源接口，方便以后支持spel语法等。

## v1.1.0

- 支持Druid数据源 (support DruidDataSource)。